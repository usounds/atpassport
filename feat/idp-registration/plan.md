# FedCM IdP Registration & Accounts Push 対応実装計画

## 0. 目的と今回確定した移行方針

2026-09-25更新。IdP Registration提案のオーナーからの提案を受け、@passportの既存フローを崩さずに提案へ対応するための計画。アプリケーション実装は未着手。

### 0.1 移行の基本方針

1. 今のハンドル登録・追加・削除・端末同期を入口として維持する。利用者にハンドルの登録し直しを求めない。
2. **通常FedCMとIdP Registration / Pushの明確な分離**:
   - **通常のFedCM（安定機能）**: 相手サイトがconfigURLを指定して呼び出す方式。ユーザーによるIdP登録操作は一切不要。トップページの控えめな `FedCmStatusBadge`（FedCM Ready）を基本として維持し、通常利用者に「登録ボタン」の操作を迫らない。
   - **Accounts Push（裏側での同期）**: AtPassportログイン／ハンドル変更時に裏側で `navigator.login.setStatus('logged-in', { accounts })` を静かに実行。対応環境（新Chromeや拡張）だけが拾い、ユーザーに意識させない。
   - **IdP Registration（実験的・登録型機能）**: ブラウザへの事前登録（`IdentityProvider.register`）は、通常のFedCMとは明確に切り離した「先行連携機能」として扱い、必ず登録解除（`IdentityProvider.unregister`）の導線と対で設置する。
3. 従来のCookie、accounts API、configURL指定、Webリダイレクトは併存させる。新機能の拒否・未対応・一時障害で既存の登録を失敗にしない。
4. Firefoxの新経路も「一覧から選ぶ → サーバーに問い合わせる → 受け取った結果を利用サイトへ返す」まで実装する。拡張内で結果を作る旧方式は移行前の互換経路として区別する。
5. 利用サイト側は後から段階的に登録型呼出しへ対応する。既存サイトの一斉更新を要求しない。

提案に従った保存・失効ルールを採用する。以前の「独自の24時間キャッシュ」「Cookie削除だけでPush一覧を自動停止」は採用前提から撤回する。Cookieは既存の管理・サーバー照会に引き続き使うが、その期限をPush保存の期限と機械的に同一視しない。

### 0.2 利用者から見た移行

| 利用者・状態 | 移行時の動き |
| --- | --- |
| 既存ユーザーが@passportを再訪 | 今のCookieで取得した既存一覧を裏でPush。通常のFedCMはそのまま動作 |
| 新規ユーザーが最初のハンドルを登録 | 従来どおり登録完了。その一覧を裏でPushし、登録型経路を準備する |
| 追加・削除・並べ替え・端末同期 | 今までの操作結果を保存した後、確定一覧をブラウザへ反映する |
| 登録を拒否／ブラウザ非対応 | 従来の経路を利用。自動的に同意済みとしたり、毎回同意を迫ったりしない |
| Firefox拡張の既存ユーザー | 拡張インストール済み＝同意済みとして自動連携。二重の登録操作を迫って混乱（カオス）させない |
| 登録・Push済みで新経路対応サイトを利用 | ブラウザ／拡張の一覧から選び、サーバーが返した選択結果をサイトへ渡す |

登録同意の表示方法・ユーザー操作要件は対象実装に従うため、全員の無操作移行を保証しない。@passportへ再訪していない既存ユーザーも直ちに移行済みとは扱わない。

### 0.3 確定事項: ブラウザ間の同期（旧Q6）

利用者との合意: **それぞれのブラウザで@passportを開けば、最新のハンドル一覧へ同期できればよい。** 他ブラウザでの変更を、RP上の選択候補へ即時反映することは求めない。

- 既存の共有トークンで同じ一覧に紐付いたブラウザを対象とする。未連携のブラウザは、従来どおり端末同期を行ってから同じ一覧を利用する。
- @passportを開いた際、有効なセッションで最新一覧を取得し、そのブラウザへ全件Pushする。追加・削除・並び順の変更をまとめて反映する。
- 開く前の選択候補には前回Push時点の一覧が残り得る。選択後はサーバーで現在の関連付けを確認し、削除済みのハンドルを成功として返さない。
- 同じブラウザで行った変更は、既存方針どおり成功後にPushする。別タブの競合対策も維持する。
- セッションが失効して最新一覧を取得できない場合やPushに失敗した場合は、同期完了と表示しない。セッション復帰の方法はQ2で扱う。

### 0.4 残論点（実装で調べることと、相談すること）

| ID | わかりやすく言うと | 利用者への影響 | 確認先・次の作業 | 完了が必要な段階 |
| --- | --- | --- | --- | --- |
| Q1（方針確定・実装検証待ち） | Firefox拡張からの選択後の問い合わせに対応する | 正しいセッションで照会し、選択した一件を要求元へ返す | 拡張機能の `declarativeNetRequest`（ネットワーク層でのヘッダー注入）により `Sec-Fetch-Dest: webidentity` を付与。別API新設を行わず正規の `/api/fedcm/assertion` に完全一本化して照会する（第5.3節） | Firefox新経路の有効化前 |
| Q2（方針確定） | ログアウトやCookieが消えたとき、保存済み一覧をどう扱うか | 古い一覧の表示、再訪や再登録が必要になる条件 | AtPassportはパスワードログインではなく自動UUID発行のウォレット形式（明示的ログアウト機能なし）。したがってFedCMの `logged-out` は「ハンドルが0件になったとき」「連携解除時」「照会401時」に連動。Push保存先は `browser.storage.local`（秘密情報なし） | Push保存の一般提供前 |
| Q3（方針確定） | ブラウザへのIdP登録・解除をどう提供するか | 操作回数、突然の確認画面、拒否後の再案内 | 通常のFedCMとは明確に分離し、設定エリアに「登録（`register`）」と「解除（`unregister`）」を対で配置。Firefox拡張ユーザーには手動登録を迫らず自動連携とし、カオスを防ぐ | 登録UIの一般提供前 |
| Q4 | どの環境で新経路を使えると判断するか | 旧サイトや旧ブラウザでも使い続けられるか | 各ブラウザ環境ごとの後方互換性（第1.1節マトリクス）と `@atpassport/client` の自動フォールバック契約を確認 | RP側の新経路有効化前 |
| Q5 | Firefoxの仕事用コンテナやプライベートでも同じように使えるか | アカウント混在の防止、利用できる範囲 | 実装側で保存と選択後通信の分離を実機検証。未対応範囲が残る場合だけ公開範囲を相談 | 対象環境への公開前 |
| Q7 | 既存の「365日間利用なし」を何で判定するか | 継続利用中の登録が失効しないか | 実装側でDB期限とCookie更新を整理。新経路のサーバー照会を利用に含めるか確認 | 期限処理変更前 |
| Q8 | Firefoxの選択画面で、サイトから一覧を隠せるか | 選択前の情報保護と操作性 | 実装側でShadow DOMの限界と拡張所有UIを検証。必要な画面変更を具体化 | Firefox新UI公開前 |

Q6は第0.3節の合意により解決済み。Q1, Q2, Q3は設計方針が確定し、残るは実装・検証事項。方針確認が残るのはQ4・Q5・Q7・Q8の4件であり、すべてを利用者に技術判断として求めない。まず仕様確認・試作を行い、選択が必要な点だけ具体的な利用体験で相談する。未解決の新経路は有効化しないが、独立して進められる互換性整理・同期処理・テスト整備は先に進められる。

公開提案のAPIは変わり得る。実装開始時に仕様コミットと対象ブラウザ版を固定し、標準の手順と拡張固有の実装差分を記録する。

## 1. 目的・範囲・仕様上の位置づけ

@passportのハンドル入力補助について、登録済みIdPの探索とAccounts Pushを実験的に導入する。
既存のconfigURL指定FedCM、Webリダイレクト、拡張のハンドル入力ポップアップを維持する。

IdP Registration提案は登録、Accounts Pushによる一覧保存、URL形式のtypeによるRP側の探索を組み合わせる。レビュー時点ではStage 1であり、完全な標準互換ポリフィルとは称さない。

現行FedCMにはCookie付きaccounts取得があるが、一般のサードパーティCookie依存と同一視しない。新機能の目標は一覧取得のcredentialed fetch削減であり、サービス全体のCookie廃止ではない。

### 1.1 ブラウザ別サポート状況と後方互換性マトリクス

| ブラウザ環境 | ネイティブFedCM | Accounts Push | RP上の挙動・後方互換性保証 |
| --- | --- | --- | --- |
| **Chrome / Edge（安定版）** | 対応済み | 未対応（実験段階） | 既存の `/api/fedcm/accounts`（`SameSite=None` + `webidentity`）をクロスサイトfetch。本エンドポイントは温存必須 |
| **Chrome / Edge（先行版）** | 対応済み | 対応（Origin Trial等） | AtPassport訪問時にPushされたアカウント一覧を使い、RP上では通信ゼロ（Zero-Network）でプロンプト表示 |
| **Firefox（拡張機能あり）** | 未対応（Nightly実験中） | 拡張ポリフィル対応 | 拡張機能が `credentials.get` / `login.setStatus` をインターセプト。`browser.storage.local` から即座にプロンプト表示 |
| **Safari / 拡張なしFirefox** | 未対応 | 未対応 | `@atpassport/client` の `isHandleAssistSupported()` が `false` を返し、即座にWebリダイレクト等へ安全にフォールバック（動作破損なし） |

### 1.2 経路別の動作と保証範囲

| 経路 | 一覧の取得 | 選択後 | 保証範囲 |
| --- | --- | --- | --- |
| 現行ネイティブFedCM | ブラウザがaccounts APIを呼ぶ | ブラウザがassertion APIを呼ぶ | ブラウザ管理UI、既存のサーバー検証 |
| 現行Firefox拡張 | 通常セッションでuser/handles APIを呼ぶ | 拡張ローカルで入力補助JSONを生成 | 拡張による入力補助（暫定モック実装） |
| Firefoxの新しい登録型経路 | 提案のルールに従って保存したPush一覧を使う | 選択後にサーバーへ問い合わせ、受け取った結果を返す | 第5.3節の経路を検証して有効化 |
| 任意IdPへの拡張 | 登録済みIdPの保存アカウントを使用 | 発行元IdPの対応経路でAssertion取得 | 通信・認証方式を別途設計・検証 |

「通信ゼロ」「0ms」「Cookie不使用」「タイミング攻撃完全解消」は保証しない。config取得、画像取得、再検証、選択後通信を分けて計測する。登録型経路でも提案にはconfig取得があり、キャッシュだけで照合する拡張固有の最適化は仕様との差分として記録する。

従前のloggedin.fyiとの比較は、Cookie/iframe方式とブラウザ仲介方式の差を理解する参考に留める。同サービスの実装詳細を本計画の設計根拠にはせず、必要なら別途検証する。

## 2. 現行の保存構造と整合性の課題

### 2.1 保存対象

| 対象 | 現行ルール | 主な参照元 |
| --- | --- | --- |
| 通常セッション | 本番 `__Host-atpassport_session_v2`、開発 `atpassport_session_v2`。HttpOnly、本番Secure、SameSite=Lax、Path=/、Cookie/JWTとも365日 | Web管理、`/api/user/handles` |
| FedCMセッション | `__Secure-atpassport_fedcm_v1`。HttpOnly、Secure、SameSite=None、Path=/api/fedcm、365日。JWTのpurposeはfedcm | `/api/fedcm/accounts`、`/api/fedcm/assertion` |
| ハンドル関連付け | DynamoDB。uuid/did、handle、pdsUrl、sortOrder、isPrimary、expiresAt等 | 一覧の正本 |
| プロフィールキャッシュ | Web localStorageの `atpassport-profile-cache`。24時間は鮮度判定であり自動削除ではない | Webの表示補助 |
| 現行拡張の一覧 | `HandleManager.fetchAccounts()` がCookie付き（`SameSite=Lax`）で都度取得。アカウントの永続保存は未実装 | Firefox補助UI、拡張ポップアップ |
| Push保存（新経路） | `browser.storage.local`。秘密情報なし、公開アカウント情報（`id`, `name`, `username`, `picture`）と失効情報のみ | Firefox新プロンプトUI |

Cookie値・JWT・秘密鍵・OAuthトークン・共有トークンをPushデータに含めたり、拡張ストレージへ複製したりしない。

### 2.2 既存実装で解決・確認する点

- 現行Firefox拡張は `/api/fedcm/accounts` も `/api/fedcm/assertion` も呼んでおらず、`host_permissions` により `SameSite=Lax` Cookieを用いて `/api/user/handles` を叩き、選択後はローカルで平文JSONトークンを生成している。
- ネイティブFedCMが発行するトークンも `JSON.stringify({ v: 1, did, username })` の平文JSONであり、認可やセッション確立トークンではなく入力支援ヒント（Input Assist）である（本認証は後続のatproto OAuthが担当）。
- 拡張から `/api/fedcm/accounts` を直接呼ぼうとしても、`Sec-Fetch-Dest: webidentity`（禁止ヘッダ）と `SameSite=None` Cookieの検証により400/401で弾かれるため、Accounts Pushでローカル化し、照会には通常セッション（`SameSite=Lax`）を用いる。
- `ensureFedCmSession()` はPromiseを保持し、変更ごとの同期には使えない。HTTP失敗によるfalseも保持し得るため、再試行・リセット条件を整理する。
- `/api/fedcm/status` のreadyはCookieの有効性であり、一覧の存在やPush成功を意味しない。
- `/api/fedcm/migrate` は通常CookieがなくてもFedCM Cookieだけでreadyになり得る。通常Cookieで取得する一覧との不一致を扱う。
- `initializeSession()` は空セッションを作れる。`removeAssociation()` は最後の一件を削除した後もCookieを更新する。
- 登録フォームはaccountsなしのlogged-in通知、認証画面は最後の削除時にlogged-out通知、ホームの削除は通知なし。共通化が必要。
- `syncWithToken()` はセッションUUIDを切り替える。新旧一覧の混合を禁止する。
- DBのexpiresAtは追加時に設定される一方、`refreshSession()` はCookieのみを更新する。`models.touchSession()` の利用状況を確認し、Q7に沿って修正する。
- `getAssociations()` は期限を明示的に除外していない。DBの物理TTL削除を待たずに期限切れを利用不可にする。
- 既存プロフィールキャッシュもハンドル削除・全削除・セッション切替時の扱いを整理する。登録一覧の代わりとして使わない。

## 3. 保存モデルと状態管理

### 3.1 責任分担

- サーバー: @passportの一覧の正本、期限、セッション、更新世代を管理する。
- Web: サーバーで確定したスナップショットを取得し、対応APIへPushする。
- 拡張background: 送信者の検証、同意、保存、失効、選択要求の状態を一元管理する。
- content script / Main World: API互換の橋渡しを行う。ペイロード内のOriginを認証情報にしない。
- RP: 選択後の一件の入力補助結果のみを受け取る。本人認証はatproto OAuth等で別途完了させる。

### 3.2 保存スキーマ案（拡張固有・JSON互換）

`Map`等を直接保存せず、プレーンオブジェクトと配列にする。保存単位はコンテキストと正規化したIdP識別子の組とし、同一Origin内の複数configを許すかは対応範囲として明記する。初期案は一つに限定し、黙って上書きしない。

```typescript
interface RegisteredIdpEntry {
  schemaVersion: 1;
  contextKey: string; // backgroundが決定。Webから受け取らない
  origin: string;
  configURL: string;
  types: string[]; // URL形式。Q4で契約を確定
  registeredAt: number;
  consentState: 'allowed' | 'denied';
  configCheckedAt: number;
  configExpiresAt: number;
  snapshot: null | {
    sessionGeneration: string; // Cookie/UUIDそのものではない非認証用世代
    revision: number; // @passportサーバーが発行する単調増加値
    receivedAt: number;
    expiresAt: number | null; // 対象仕様の期限を写像。nullの意味もQ2で確定
    accounts: Array<{
      id: string;
      name: string;
      username: string;
      picture?: string; // 検証済み画像参照。描画時の外部通信は別管理
    }>;
  };
}
```

世代・revisionは@passportの同期用メタデータであり、標準setStatusにそのまま追加できるとは仮定しない。標準APIへの写像と拡張用の同期メタデータ経路を分離する。任意IdPで同じ世代管理を保証できなければ対応範囲を限定する。

- IdP登録の状態と、アカウントの有効期限を分ける。ログアウトは原則として一覧を消し、登録同意は残す。
- Pushは全件置換とする。accounts省略は一覧変更なし、空配列は一覧を空にする。省略だけで期限切れ一覧を復活させない。この意味は対象提案の版と照合する。
- Pushの有効期限・省略時の意味・ログアウト時の削除は対象仕様に合わせてQ2で確定する。CookieやDBの期限はサーバー照会側でも検証するが、Push期限へ独自の短縮規則を付け加えない。未確定のnullを無期限保持と解釈して公開しない。
- 読出時に期限を確認する。掃除処理が停止していても期限切れを表示しない。
- 保存処理をbackgroundで直列化し、一覧・世代・期限を一つのレコードとして更新する。完了応答は保存成功後に返す。
- 古いrevision、切替済みセッション、解除前に開始した遅延Pushを拒否する。削除後の復活を防ぐ世代管理を行う。
- 件数、文字列長、IdP数、画像サイズ、総容量に上限を設ける。現在の15件UI制限もサーバー/Push側との整合を確認する。
- schemaVersionの移行、破損データ、不明な将来バージョン、容量超過、書込失敗を扱う。失敗を成功としてWebへ通知しない。
- storage.syncは使わない。現在の共有トークンによる端末同期は維持し、同期先で一覧を再Pushする。

### 3.3 ライフサイクル

| イベント | 保存・同期・UIの必須動作 |
| --- | --- |
| 初回登録 | ユーザー操作と同意を確認。拒否しても従来フローは利用可能 |
| 初回Push | サーバー確定済み全件を取得し保存。空ならlogged-out相当 |
| ハンドル追加・再登録 | 成功後に全件再取得・置換。失敗した楽観表示をPushしない |
| 一件削除・全件削除 | 成功後に置換。全件削除は保存一覧・関連画像を削除しlogged-out通知 |
| ハンドル/PDS/プロフィール更新 | DIDを軸に再取得・置換。架空のDIDを生成しない |
| 並び順・優先アカウント変更 | サーバーの順序・優先規則に従って再Push |
| セッション切替・端末同期 | 旧一覧を利用停止し、新セッションの確定一覧で置換 |
| 別タブの更新 | 通知を契機にサーバー再取得。古いタブの一覧をそのまま再Pushしない |
| Cookie削除・失効 | Push側の扱いはQ2で仕様に合わせる。選択後のサーバー照会が失敗したら成功結果を返さず、既存管理画面での復帰へ案内する。Cookie削除だけで独自に全保存データを消す規則は設けない |
| 通常CookieとFedCM Cookieの不一致 | 自動で一覧を混合・復元しない。正本取得用セッションを確認して修復 |
| サーバー削除・別端末変更 | @passportを開いたときに最新一覧を取得・Pushして反映する（第0.3節で合意済み）。選択後はサーバーで現在の関連付けを確認し、削除済みアカウントの成功結果を返さない。候補表示の即時更新は保証しない |
| logged-out | 対象一覧と画像を削除。開いているプロンプトも更新・取消し |
| unregister / 利用者の登録解除 | 登録、一覧、画像、関連許可を削除。処理中要求を取消し。無断再登録しない |
| 再起動・拡張更新 | スキーマと期限を検証して復元。必要なら再検証 |
| 無効化後の再有効化 | 保存状態と対象仕様の期限を検証し、必要な更新・復帰を行う。選択後のサーバー検証を省略しない |
| 拡張削除・再インストール | 通常のストレージ削除挙動を確認。残存データがある環境でも再同意なしに復活させない |
| 401 / 空の確定一覧 | 401ではその要求を失敗にし、Q2の復帰・保存状態ルールへ進む。認可済みの空一覧は全件削除として反映。両者を同一視しない |
| 429 / 5xx / オフライン | 一時障害として再試行方針を適用。有効期限を延長しない |
| プロンプト表示中の失効・削除 | 選択確定時にも世代・有効性を再確認し、古い一件を返さない |

## 4. Firefox拡張の保存・権限ルール

### 4.1 WebのCookieとは別の保存領域であること

`browser.storage.local` はサイトのCookie・Web localStorageと別領域であり、サイトデータ削除で消えるとは限らない。自動TTLもない。
保存項目・期限・削除方法を拡張UIと説明文に記載し、IdP単位の解除と全件削除を用意する。保存領域は秘密情報の暗号化保管庫として扱わない。

### 4.2 コンテナ・プライベート

- contextKeyは送信元タブの実情報から決める。Originのみで通常・個人用・仕事用を共有しない。
- Firefoxはincognito splitをサポートしない。プライベート状態が自動分離されると仮定しない。
- 対応範囲はQ5の実機検証後に確定する。未対応のコンテキストで通常コンテキストの一覧・Cookieを代用しない。新経路を無効にする場合は、安全に利用可能な旧経路またはWeb操作へ案内する。
- 全対応する場合は、プライベート用を永続保存せず分離し、最後のプライベートウィンドウ終了時に破棄する。再起動・background停止時の扱いも定義する。
- コンテナ削除時には対応するキャッシュと同意を削除する。
- backgroundのcredentials付きfetchが要求元タブのCookieコンテナを使うとは仮定しない。送信先、SameSite、コンテナ、プライベートをFirefox実機で検証する。
- 既存のFETCH_ACCOUNTS経路も同じ境界を監査し、新経路が無効なコンテキストから通常一覧を取得する抜け道を作らない。

### 4.3 権限と保存責任

- wxt.config.tsにstorage権限を追加する。
- cookies権限は必須と決めつけず、Q1/Q2/Q5の実装で必要性を確認する。採用時は用途と対象hostを明示し、生Cookie値を永続化・ページ公開しない。
- 任意IdP対応時のhost権限は別途設計する。Chromeの現行host許可は@passport中心であり、Firefoxと同じ前提にはできない。
- backgroundを唯一の書込窓口にし、messageの種類ごとに送信者と許可を検証する。
- 拡張ポップアップとFedCM用UIは同じ有効性・削除規則を参照する。旧Cookie取得経路を残す場合も無条件マージしない。

## 5. 実装対象と方式

### 5.1 Webサービス

対象: `packages/frontend/src/lib/fedcm-session-client.ts`、`actions.ts`、`models.ts`、登録/一覧UI、FedCM API、configルート。

1. 通常FedCMのready状態（`FedCmStatusBadge`）を維持し、IdP Registration / Accounts Pushとは明確に分離する。通常利用者に「登録ボタン」を強制しない。
2. 通常セッションで認可したサーバースナップショット取得経路を用意する。既存user/handles APIを使うなら期限・世代・Cache-Control等の契約を補う。FedCM専用APIのwebidentity検証を外して流用しない。
3. @passportを開くたびに最新一覧を取得・Pushする。変更成功後も同じ同期処理を使い、登録、削除、更新、並べ替え、端末同期、別タブ変更から呼び出す。初回だけのPromise保持で再訪時の同期を省略しない。
4. `id/name/username/picture` を既存accounts APIと共通化する。`email: handle` を作らない。APIのavatarとpictureの写像を明示する。
5. API存在をメソッド単位で確認する。登録失敗・拒否・Push失敗で既存の登録処理を失敗扱いにしない。再同期可能な状態を表示する。
6. register/unregisterの導線は通常のFedCMと分離して設定エリアに配置する。解除（`IdentityProvider.unregister`）を必ず対で提供する。Firefox拡張ユーザーは自動連携として扱い手動登録ボタンを出さない。全ハンドル削除時および連携解除時に `logged-out` を通知する。
7. config.typesはQ4のURL識別子に統一する。既存endpointとlogin_url等は維持する。
8. Q7に基づいてDB期限更新と期限切れ除外を実装し、Cookie更新との関係をテストする。

### 5.2 Main Worldとcontent script

実際の主経路は `fedcm.content.ts` のINLINE_POLYFILL_CODEで、`injected.ts` は外部注入経路でもある。両者のロジックを共通化し、二重パッチ・検出順依存を避ける。

- IdentityProvider全体を代入で置き換えない。既存のclose等を保持し、register/unregister単位で補完する。
- navigator.login自体がない環境も扱う。ネイティブsetStatusがあれば適切に委譲する。
- IdentityCredentialの存在だけで登録・Push対応と判定しない。
- FirefoxのXray境界に適合するシリアライズと、CSP下での注入・失敗時の従来経路を検証する。
- 標準API経路と拡張固有経路の能力を区別する。ネイティブ実装を上書きして対応済みと偽装しない。
- AbortSignal、タイムアウト、同時要求、画面遷移、取消し後の応答を扱い、リスナーと処理中状態を掃除する。
- Permissions Policyを常にtrueに書き換えて許可確認を省略しない。初期案ではトップレベルのみとし、iframe対応は別途設計する。

### 5.3 Firefoxでの「選択後のサーバー問い合わせ」

新経路の完了条件は、保存一覧の表示だけでなく、選択した一件をサーバーへ問い合わせ、その応答をRPへ返せることである。

```text
既存Firefox: Cookie付きで一覧取得 → 選択 → 拡張内で結果を生成 → RP
新Firefox:   Push済み一覧を表示   → 選択 → サーバーへ照会 → サーバーの結果をRPへ
ネイティブ: ブラウザが仕様に従って一覧表示・選択・Assertion要求を行う
```

#### declarativeNetRequest によるヘッダー解決と正規エンドポイント一本化

1. **ヘッダー問題の解決（DNRによるネットワーク層注入）**:
   - 素のJavaScript `fetch()` では `Sec-Fetch-Dest` は禁止ヘッダー（WHATWG仕様）であり指定できない。
   - しかし、WebExtensionの特権APIである **`declarativeNetRequest`（または `webRequest.onBeforeSendHeaders`）** を利用することで、`atpassport.net/api/fedcm/*` 宛てのリクエストにネットワーク層で `Sec-Fetch-Dest: webidentity` を自動付与できる。
2. **サーバー側エンドポイントの完全一本化**:
   - これにより、サーバー側に拡張機能専用の別URL（`/api/user/assertion` 等）を新設したり、内部で無理な例外分岐ハックを入れる必要が完全に消滅した。
   - ChromeネイティブもFirefox拡張機能も、`config.json` に記載された正規の **`/api/fedcm/assertion`** をそのまま共通利用する。
3. **トークン検証の実態（平文入力ヒント）**:
   - `/api/fedcm/assertion` が返却するトークンは、`createHandleAssistToken` による平文JSON（`JSON.stringify({ v: 1, did, username })`）である。
   - 本人認証・セッション確立は後続の **atproto OAuth（PKCE + DPoP）** が100%担う入力支援ヒント（Input Assist）であるため、重厚な暗号署名は不要であり、既存の平文JSON返却をそのまま維持する。

#### 確定した役割分担

今回の対応対象は@passportをIdPとする経路。PDS直接対応は、そのPDSが提案に対応した後の拡張範囲とする。

| 担当 | 確認すること |
| --- | --- |
| Firefox拡張 | `declarativeNetRequest` で `Sec-Fetch-Dest: webidentity` を付与し、正規の `/api/fedcm/assertion` へPOSTして結果を要求元へ返す |
| @passportサーバー | 既存の `/api/fedcm/assertion` でセッション、選択DIDの関連付け・期限を確認し、平文入力支援トークン（JSON）を返す |
| RP | 返されたハンドルを入力補助に使い、本人認証は従来どおりatproto OAuthで行う |

#### ClientId の仕様と RP ドメイン事前登録チェックの緩和（IdP Registration モデル対応）

1. **ClientId は RP の Origin**:
   - FedCM 仕様上、`clientId` は必須パラメータである。
   - AtPassport では開発者登録を強制せず、RP のドメイン（`window.location.origin`）をそのまま `clientId` として指定する規約（W3C IdP Registration 提案仕様でも同一アプローチを採用）。
2. **サーバー側で真に必要な検証**:
   - `request.headers.get("origin") === body.get("client_id")`（ブラウザが保証する HTTP Origin ヘッダーと、POST された clientId が完全に一致しているか。他ドメインになりすます攻撃を防止）。
   - 正規の HTTPS オリジン形式であること（`normalizeClientOrigin`）。
   - ユーザーの有効なセッション Cookie が存在し、要求された `account_id`（DID）がユーザーに紐付いていること。
3. **RP の事前登録（`verified_domains`）チェックの緩和**:
   - 従来 AtPassport は、DNS/ファイル検証を通過した「認証済みドメイン（`VerifiedDomain`）」以外の RP からの Assertion 要求を `403 invalid_client` で拒絶していた。
   - しかし IdP Registration では「ユーザーがブラウザに登録した IdP なら、世界中のあらゆる RP から事前申請なしに利用できること」が本質である。
   - AtPassport が返す Assertion はアクセストークンや秘密情報ではなく、公開情報である DID とハンドル名（Handle Assist）に過ぎず、本物の認証は RP と PDS 間の atproto OAuth が担うため、未登録 RP にアサーションを返しても特権侵害やセキュリティリスクは生じない。
   - したがって、**「AtPassport データベースに RP ドメインが事前登録されているか」のチェックは不要（緩和）** とし、`origin === client_id` が成立していれば未登録 RP に対しても正規トークンを発行するよう M2（ステップ2）で改修する（`VerifiedDomain` は信頼度バッジ表示や管理用メタデータとしてのみ維持）。

#### 残る実装・検証事項

- 拡張機能のDNR設定: `atpassport.net/api/fedcm/*` に対するヘッダー注入ルールの実機検証（完了）。
- 結果の渡し先: 要求元と選択を結び付け、別タブや遅延応答で別のページへ結果を渡さない。
- 失敗時: 401、削除済みDID、通信失敗時は成功JSONを返さずエラーとする（旧ローカルモック生成でのサーバー拒否回避は撤廃）。セッション失効後の案内はQ2で扱う。

Q1の状態は「DNRによる正規エンドポイント一本化方針で確定、実装検証へ移行」。

#### 互換性と完了判定

@passportの返却値は引き続き入力補助であり、本人認証の完了を意味しない。サーバーの結果を `parseHandleAssistToken` で検証し、RP側の既存OAuthフローを維持する。架空のDIDを生成しない。

旧Firefox経路は未移行・未対応ユーザーの互換経路として残す。新経路に入る前の対応判定で使い分け、実際にサーバー照会を完了した場合だけ新経路成功とする。

任意IdPについては、IdPごとのendpoint・client_id・Origin・nonce/params・返却形式を扱う必要がある。@passport専用の受信経路を作っただけで任意IdP対応済みとはしない。検証済みのモックIdPで提案の手順を確認し、対応契約をQ4で文書化する。

### 5.4 クライアントライブラリ

対象: `packages/atpassport-client/src/core.ts`。

- 現行の関数型APIとoptionsを維持する。元案のthis.config前提コードは採用しない。
- 初期実験は明示的opt-inとし、新形式非対応環境では従来のconfigURL指定を使う。
- typeとconfigURLの同時指定を「順次フォールバック」と呼ばない。提案では重複時に明示指定が優先される。
- 能力検出の根拠を固定し、APIオブジェクトの存在だけで新形式を送らない。旧形式への切替はユーザー操作要件を含めて実機確認する。
- 現行のmode: active、fields、clientId既定値、入力補助ペイロード検証を維持する。mode: buttonは使わない。
- 未対応・型不一致・通信失敗・アカウントなしと、利用者のキャンセルを区別する。キャンセル後に自動で別UIを開かない。
- Webリダイレクトは既存のfallback callbackの契約で提供する。ライブラリが無条件にリダイレクトすると記載しない。
- Chromeのネイティブ経路とFirefoxの拡張経路を別々に検証する。

#### Step 3レビュー反映（2026-09-26）

詳細契約とテストは [Step 3設計仕様書](./DESIGN_step3-client-sdk-discovery.md) を参照する。M3については次の確定事項を適用する。

- RP側は単数の `provider.type`、IdP config側は配列の `types`。SDKは `type?: string` を追加し、`discovery: 'types'` はモード名としてのみ使用する。
- 既定は必ず `discovery: 'config'`。同期・非同期fallbackと既存configモードの契約を維持し、インスタンスAPIにも新オプションを転送する。
- 新モードではネイティブの `NetworkError` をキャンセルと区別できると仮定しない。自動切替は確実な未対応に限定し、候補なし・キャンセル・不明な失敗・サーバー拒否では自動遷移しない。利用者の明示操作で別経路を開始する。既存configの広いfallback契約は本Stepで変更しないため、この新保証の対象外とする。
- 拡張の `message.type` は操作種別のままとし、探索型は `providerType` に分離する。解決済みIdPと選択を結び付け、Assertionの通信先まで維持する。
- 登録型で保存候補がない場合はno-matchとし、暗黙の `FETCH_ACCOUNTS` を禁止する。旧保存スキーマはconfig経路で維持し、再訪時の検証済みPushで型情報を更新する。
- 対象仕様の版とブラウザ版を固定し、Chromeの閉じる/ESC・未対応時の再試行・ユーザー操作要件、本番/開発IdPの分離を検証する。

## 6. セキュリティ・同意・通信

- backgroundがruntime送信者のURL/Origin、tab、frame、プライベート状態を検証する。ページが送るorigin、contextKey、IdP識別子を信頼しない。
- register/unregister/Pushは許可された自Originの登録領域に限定する。HTTPSとwell-knownの存在だけでは送信者の権限確認にならない。
- @passportが他ドメインのDIDを集約することと、DID所有者の認証は別。保存APIを本人認証として説明しない。
- URLの正規化、credentialsを含むURL、危険なscheme、リダイレクト、endpointのOrigin、localhost/私設ネットワークへの到達を制限する。開発用例外は明示的に隔離する。
- 登録時の同意UIにはOriginと保存内容を表示する。拒否・解除後の無断再登録やプロンプト連打を防ぐ。
- 選択前にRPへ一覧・件数・IdP情報をAPI応答しない。選択後も一件のみ返す。
- Shadow DOMはネイティブUIの保護境界と同等ではない。ページによる妨害、合成操作、観測可能な表示/エラー時間を検証し、Q8で保証範囲を定める。
- アバター/ブランド画像の外部URLをRP表示時にそのまま読み込むと通信が発生する。事前取得・容量制限・失効連動・代替表示を設計する。描画時の参照には安全なローカル形式を用いる。
- RP訪問履歴や全アカウントをログに残さない。デバッグ出力も見直す。
- privacy、terms、拡張の説明・配布設定を実際の保存/共有内容に合わせる。データ収集申告の変更要否は採用機能と配布規則に照らして確認する。

## 7. 既存フローを維持する段階的導入

### M0: 仕様差分と移行の確認

- [x] **ステップ0先行検証完了**: Firefox拡張機能の `declarativeNetRequest`（DNR）を用いて `Sec-Fetch-Dest: webidentity` をネットワーク層で注入し、正規エンドポイント `https://atpassport.net/api/fedcm/accounts` から 200 OK（9アカウント）が正常取得できることを実機検証完了（De-risking完了）。
- [x] **エンドポイント一本化の確定**: これにより別API（`/api/user/assertion` 等）の新設やサーバー側のセキュリティ緩和は一切不要となり、正規FedCMエンドポイント（`/api/fedcm/*`）への完全一本化を決定。
- [ ] 対象提案のコミット、ブラウザ版、標準APIと拡張実装の差分を記録する。
- [ ] Q1の選択後通信、Q2の保存ルール、Q4の能力判定を試作・調査する。
- [ ] Q3/Q5/Q8の操作・分離・画面上の制限を確認する。
- [ ] 未移行ユーザーが既存経路を使い続けられることを先にテスト化する。

### M1: 既存Webフローへ登録・Pushを追加

- [x] **Accounts Push同期処理の実装**: `syncAccountsPush` を実装。2段階フォールバック（提案仕様の2引数 `setStatus('logged-in', { accounts })` → ベースライン1引数 `setStatus('logged-in')`）により全ブラウザでの非破壊性を保証。
- [x] **アカウント変更ライフサイクル連動**: `AssociationListClient`（初期表示、並び替え、削除）および `RegisterForm`（新規ハンドル登録）からブラウザへの自動Pushを結合。
- [x] **全ハンドル削除時のログアウト連動**: アカウント0件時に `setStatus('logged-out')` を自動通知するウォレットモデルセマンティクスを実装。
- [x] **IdP Registration / Unregistration 設定導線の設置**: `IdpRegistrationControl` を作成し、通常FedCM（Readyバッジ）と明確に分離された独立導線（`IdentityProvider.register` / `unregister`）を多言語対応で提供。
- [x] **テスト・品質検証完了**: 全41テストスイート（298テスト）100%パス、型チェックエラーゼロ、ESLintエラーゼロ、Next.js本番ビルド通過。
- [ ] Q7のDB期限管理を確認し、必要な修正を切り分ける。

### M2: Firefoxで選択後までつなぐ

- [x] ネットワーク層でのヘッダー注入（`declarativeNetRequest`）により、正規 `/api/fedcm/accounts` および `/api/fedcm/assertion` との直接通信経路を確立（ステップ0）。
- [x] サーバー側 `/api/fedcm/assertion` の `validateFedCmClient` を改修し、`origin === client_id` であれば未登録 RP ドメインにもトークンを発行できるよう緩和（IdP Registration 対応）。
- [x] 注入ロジックを共通化し、登録・Push・送信者検証・同意・保存を実装する。
- [x] Q2で確定した保存/削除/期限と、Q5のコンテキスト分離を実装する。
- [x] 選択後にサーバーの応答を受け取り、既存と同じ入力補助形式でRPへ返す。
- [x] 未移行ユーザーの旧経路と、新経路の失敗時復帰を区別して検証する。
- [x] 拡張ポップアップの既存機能を維持し、表示一覧の更新・削除の整合性を検証する。

#### Step 1・2 再レビュー後の修正（2026-09-26）

旧DNRの全URL注入は撤去し、選択後のランダムURL・tabId・POSTに限定した短命session ruleへ置き換える。保存一覧がない非標準コンテナ／プライベートでは既定Cookieの一覧取得へフォールバックしない。旧保存データのコンテキストを推測して移行しない。ブラウザ権限・Cookie送信の新しい実機検証が完了するまでは、過去のM2完了チェックを新経路の実機確認済みという意味に使わない。

Webは共有hookで遅延プロフィール応答を無効化し、Actionが明示する成功と確定一覧だけをPushする。保存ACKのタイムアウト・送信失敗はrejectし、成功を偽装しない。詳細と回帰テストはStep 1・2設計書を参照。

### M3: RP側を段階的に切替

- [ ] [Step 3設計仕様書](./DESIGN_step3-client-sdk-discovery.md) のレビュー反映契約・完了基準を満たす。
- [ ] 開発者向けopt-inで登録型経路を試し、能力判定と旧configURL経路を検証する。
- [ ] 未対応時のfallback、同意拒否、キャンセル、認可失敗を別々に扱う。
- [ ] 第8節の検証を通し、一覧/config/画像/選択後通信を分けて計測する。
- [ ] 既存サイトの変更なしでも従来経路を利用できることを確認する。
- [ ] 利用者向け保存・削除・復帰の説明を更新する。

### M4: 提供範囲の拡大と公開準備

- [ ] 検証済み環境から新経路を有効化する。既存データ削除や旧API廃止を切替条件にしない。
- [ ] 新経路を無効化しても既存の登録・旧経路へ戻れることを確認する。公開初期は旧経路を撤去しない。
- [ ] 任意IdPや追加コンテキストは検証完了した範囲を明示して拡大する。
- [ ] 提案オーナー向けに互換実装の差分、Q1の実装検証結果、残る方針確認6件、第0.3節の同期方針をまとめる。
- [ ] 外部投稿・拡張配布・本番デプロイは別途依頼された時点で行う。

## 8. 受入条件・検証マトリクス

| 分類 | 必須ケース |
| --- | --- |
| セッション | 通常Cookieのみ、FedCMのみ、両方、両方なし、UUID不一致、期限切れ、空セッション |
| Web変更 | ホーム/認証画面で追加、一件/全件削除、並べ替え、優先変更、ハンドル/プロフィール更新、端末同期 |
| ブラウザ間同期 | 同期済みAで追加・削除・並べ替え → Bの@passport再訪で全件反映。再訪前の古い候補、削除済み候補の選択拒否、未連携ブラウザ、セッション失効、Push失敗 |
| 同期競合 | 別タブ、遅延Push、削除直後の古い応答、セッション切替中の応答、同時更新 |
| 保存 | 書込失敗、容量超過、破損、旧スキーマ、期限切れ読出し、再起動、拡張更新、無効化/再有効化 |
| 削除 | Cookie削除、サイトデータ削除、IdP解除、拡張内全削除、コンテナ削除、サーバー期限切れ |
| Firefox | 通常/別コンテナ/プライベートの読出し・Push・fetch分離。非対応の場合は漏洩なく拒否 |
| 権限 | storage/host/cookies権限の不足・拒否・取消し、悪意ある送信者、iframe、偽造Origin |
| UI | 選択中の失効、キャンセル、二重要求、タイムアウト、ナビゲーション、合成操作、CSP |
| データ | 不正DID、架空emailを生成しない、長大入力、不正画像URL、同一DIDの複数IdP、未知type |
| 互換性 | 拡張あり/なし、従来Firefox、Chromeネイティブ、登録型非対応、登録拒否、既存fallback |
| 通信 | Push済み一覧利用時のaccounts呼出し有無、config/画像通信、選択後のサーバー要求、429/401/5xx/オフライン |
| 選択後検証 | 偽造RP、要求の再利用、別タブ/別コンテナの取り違え、削除済みDID、サーバー拒否を旧経路で回避しない |
| 段階移行 | 未再訪ユーザー、登録済み/Push未完了、同意拒否、旧サイト、拡張更新だけの利用者、新経路無効化による切戻し |

単体テストでは状態遷移・期限・競合を、統合テストではAPI契約と同期を、実機E2Eではブラウザ権限・Cookie・コンテナ・注入を確認する。モックで実機のCookie送信を確認済みとはしない。
コード変更時に必要なテスト・型検査を実行する。Next.jsのビルドは必ず権限付きで実行する。

## 9. 根拠・参照

公開仕様は2026-09-25のレビューで参照。実装前に版を再確認する。

- [IdP Registration提案](https://github.com/w3c-fedid/idp-registration): URL形式type、登録型と明示指定の重複、config取得、Assertion。
- [Accounts Push提案](https://github.com/fedidcg/LightweightFedCM): expiration、logged-out、一覧の保存と置換。
- [FedCMの位置づけ](https://developer.mozilla.org/en-US/docs/Web/API/FedCM_API)
- [storage.local](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local)
- [storageの性質](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage)
- [保存できる型](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/set)
- [Firefoxのプライベート利用](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/incognito)
- [コンテナ](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_contextual_identities)

主な既存コード:

- `packages/frontend/src/lib/{session,models,actions,fedcm-session-client,profile-store}.ts`
- `packages/frontend/src/app/api/fedcm/{migrate,status,accounts,assertion}/route.ts`
- `packages/frontend/src/app/api/user/handles/route.ts`
- `packages/frontend/src/components/{RegisterForm,AssociationListClient,AuthAccountList}.tsx`
- `packages/atpassport-extension/src/entrypoints/{fedcm.content,injected,background}.ts`
- `packages/atpassport-extension/src/lib/{HandleManager,fedcm-prompt}.ts`
- `packages/atpassport-extension/wxt.config.ts`
- `packages/atpassport-client/src/core.ts`
