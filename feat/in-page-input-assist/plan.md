# FedCM（Federated Credential Management API）対応およびページ内入力アシスト 実装計画

## 1. 目的と背景

### 1.1 課題と背景
現在の @passport では、ブラウザ拡張機能のツールバーアイコンを開いてハンドルを選択するか、サイト側が @atpassport/client のモーダルを表示して連携する必要がある。
従来の拡張機能による「ページ内自動入力アシスト」（DOM監視、任意ホスト権限、iframe注入）は、以下の根本的課題を抱えている：

1. **過剰な権限要求**: 任意サイトの閲覧情報にアクセス可能な権限（`https://*/*` や `<all_urls>`）を要求するため、利用者に高いセキュリティ不安を与える。
2. **DOM / CSS 競合と脆弱性**: サイト側のスクリプトやスタイルとの競合、z-index問題、クリックジャッキング対策など、拡張機能注入UI特有の保守コストとリスク。
3. **サードパーティCookie規制**: 今後のブラウザのサードパーティCookie廃止・制限環境において、外部サイトからのクロスサイト認証連携が遮断される。

### 1.2 FedCM（Federated Credential Management API）の採用
W3C標準である **FedCM** を導入することで、ブラウザ標準のセキュアなネイティブアカウント選択UIを利用し、拡張機能への過剰権限やDOMインジェクションなしに、安心・安全なハンドル入力アシストを実現する。FedCMで返す情報は入力候補であり、利用者の本人確認は各RPが後続のatproto OAuthで行う。

### 1.3 対象外

- @passport自体を中央集権型のログインプロバイダーとして利用する機能は、本計画の対象外とする。
- @passportはDIDの本人性を保証する署名付きID Tokenを発行せず、RPのログインセッションを直接確立しない。
- atprotoアカウントの本人確認、認可、PDSアクセスは、RPがatproto OAuthの完全なフローと検証要件に従って実施する。

---

## 2. 基本方針

1. **IdP（Identity Provider）としての標準準拠**:
   - `atpassport.net` を FedCM IdP として機能させ、ブラウザが直接対話可能な標準エンドポイントを提供する。
2. **プライバシー・バイ・デザイン**:
   - ユーザーが明示的にアカウント（DID/ハンドル）を選択するまで、RP（利用側Webサイト）にはユーザーの登録ハンドル一覧やセッション有無は一切開示されない。
3. **プログレッシブ・エンハンスメント**:
   - FedCM を最優先（Primary）のネイティブ体験とする。
   - FedCM 非対応ブラウザ（Firefox等）や未対応環境に対しては、既存の `@atpassport/client` モーダルおよび拡張機能をシームレスなフォールバック（Secondary）として維持する。
4. **Button Mode（アクティブ操作）とパッシブ検出の両立**:
   - 入力欄クリックや「@passportで入力」ボタンによる明示的なユーザージェスチャーを起点とする（FedCM Button Mode）。
5. **対応ブラウザ範囲**:
   - FedCM経路は Chrome 141以降および同等のChromium 141以降を基準とする。
   - それ以前のブラウザやFedCM非対応ブラウザでは、既存フローへフォールバックする。

---

## 3. システムアーキテクチャ

```text
┌─────────────────────────────────────────────────────────────┐
│ RP (Relying Party: 利用側Webサイト)                         │
│  <input name="handle"> または [@passportで入力] ボタン      │
│  └─ @atpassport/client (navigator.credentials.get)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ 呼び出し
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ ブラウザ (User Agent: Chrome / Edge 等)                     │
│  ・ネイティブのアカウント選択ダイアログ表示                 │
│  ・RPスクリプトから隔離された安全なクレデンシャル伝達       │
└──────────────┬──────────────────────────────▲───────────────┘
               │ 1. GET /fedcm/config.json    │
               │ 2. GET /api/fedcm/accounts   │ 4. Token返却
               │ 3. POST /api/fedcm/assertion │
               ▼                              │
┌─────────────────────────────────────────────────────────────┐
│ IdP (@passport サーバー: packages/frontend)                 │
│  ・HttpOnly セッションCookie検証                            │
│  ・Sec-Fetch-Dest: webidentity ヘッダー検証                 │
│  ・登録済みDIDs/ハンドル一覧提供                            │
│  ・選択されたDIDとハンドルを文字列Tokenとして返却           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. IdPエンドポイント仕様（`packages/frontend`）

FedCM仕様に従い、以下のエンドポイントを実装する。全エンドポイントで HTTPS を必須とし、ブラウザ専用ヘッダーの検証を行う。

### 4.1 Discovery (`/.well-known/web-identity`)
ブラウザがIdPの設定ファイルを探索するためのエントリーポイント。

- **URL**: `/.well-known/web-identity`
- **Method**: `GET`
- **レスポンス**:
  ```json
  {
    "provider_urls": ["https://atpassport.net/fedcm/config.json"]
  }
  ```

### 4.2 設定マニフェスト (`/fedcm/config.json`)
IdPの各エンドポイントおよびブランディング情報。

- **URL**: `/fedcm/config.json`
- **Method**: `GET`
- **レスポンス**:
  ```json
  {
    "accounts_endpoint": "/api/fedcm/accounts",
    "client_metadata_endpoint": "/api/fedcm/client_metadata",
    "id_assertion_endpoint": "/api/fedcm/assertion",
    "login_url": "/en/fedcm/login",
    "branding": {
      "background_color": "#18181b",
      "color": "#ffffff",
      "icons": [
        {
          "url": "https://atpassport.net/icon128.png",
          "size": 128
        }
      ]
    }
  }
  ```

### 4.3 アカウント一覧取得 (`/api/fedcm/accounts`)
現在 @passport にログインしているユーザーの連携アカウント（DID / ハンドル）一覧をブラウザに渡す。

- **URL**: `/api/fedcm/accounts`
- **Method**: `GET`
- **セキュリティ検証**:
  - `Sec-Fetch-Dest: webidentity` ヘッダーが必須。存在しない場合は 400 Bad Request。
  - FedCM専用セッションCookieを検証。未ログイン時は 401 Unauthorized。
  - 既存の `SameSite=Lax` セッションCookieは変更せず、FedCMエンドポイント専用に `Secure; HttpOnly; SameSite=None` Cookieを発行する。
  - 専用Cookieは `/api/fedcm` にPathを限定し、通常のWebセッションCookieとしては受け付けない。Cookie名には `__Secure-` Prefixを使用する。
  - 専用CookieのペイロードにはFedCM用途であることを示す識別子を含め、FedCMエンドポイント側で用途を検証する。署名には既存のサーバー側セッション署名基盤を利用し、新しい環境変数や秘密情報は追加しない。
  - ログイン成功時に通常セッションと専用Cookieを発行し、ログアウト時には両方を削除する。
  - 既存の通常セッションを持つ利用者が@passportの通常ページを訪れた場合、同一OriginのPOST経由で専用Cookieを先行発行する。専用Cookieが同じUUIDで発行済みなら書き換えない。
- **レスポンス**:
  ```json
  {
    "accounts": [
      {
        "id": "did:plc:abcdef1234567890",
        "username": "alice.bsky.social",
        "picture": "https://cdn.bsky.app/img/avatar/plain/did:plc:abcdef1234567890/avatar.jpg",
        "approved_clients": []
      }
    ]
  }
  ```

Chrome 141以降では `name`、`email`、`username`、`tel` のいずれか1項目があればよいため、ハンドルは意味的に正しい `username` として返し、実在しないメールアドレスは生成しない。`picture` は取得できる場合のみ付与する。

#### 4.3.1 FedCM専用CookieのCSRF評価

- アカウント一覧はブラウザ内部のFedCM UIだけが消費し、RPのJavaScriptへ直接公開されない。ただしDIDとハンドルは利用者情報であるため、一覧表示だけであっても無制限なクロスサイトAPIとしては扱わない。
- 通常のFetch/XHRでは設定できない `Sec-Fetch-Dest: webidentity` を必須とし、専用Cookieを一般APIの認証には使用しない。
- IDアサーション発行では専用Cookieだけに依存せず、登録済みclient IDとOriginの対応、選択されたaccount IDの所有権、ユーザー操作を追加で検証する。
- CookieのPath、用途識別子、有効期限、ログアウト時削除を単体テストとE2Eテストで確認する。

### 4.4 クライアントメタデータ (`/api/fedcm/client_metadata`)
RPの利用規約およびプライバシーポリシーURLをブラウザの同意UIに表示するためのエンドポイント。

- **URL**: `/api/fedcm/client_metadata`
- **Method**: `GET`
- **クエリパラメータ**: `client_id` (RPのオリジン、例: `https://example.com`)
- 本番環境では、既存の開発者ポータルで所有権確認済みのドメインだけをclient IDとして受け付ける。HTTPS Originとclient IDが完全一致することを検証する。
- `privacy_policy_url` と `terms_of_service_url` はFedCM仕様上の任意項目とし、確認済みドメインの設定から個別に登録できるようにする。未登録の項目はレスポンスから省略する。
- 登録URLはHTTPSを必須とし、確認済みドメインまたはそのサブドメイン上のURLだけを受け付ける。任意のURLをクエリから反映しない。
- **レスポンス**:
  ```json
  {
    "privacy_policy_url": "https://example.com/privacy",
    "terms_of_service_url": "https://example.com/terms"
  }
  ```

### 4.5 IDアサーション発行 (`/api/fedcm/assertion`)
ユーザーがブラウザネイティブUIで特定アカウントを選択した際に、ブラウザから呼ばれる。

このエンドポイントはFedCM仕様上の `id_assertion_endpoint` だが、@passportでは本人認証済みであることを証明するJWTは発行しない。返却値はハンドル入力支援用のデータであり、RPは認証情報として扱わない。

- **URL**: `/api/fedcm/assertion`
- **Method**: `POST`
- **Content-Type**: `application/x-www-form-urlencoded`
- **セキュリティ検証**:
  - `Sec-Fetch-Dest: webidentity` ヘッダーの検証。
  - `Origin` ヘッダーと `client_id` の一致検証。
  - セッションCookieと指定された `account_id`（DID）の所有権検証。
- **リクエストパラメータ**:
  - `client_id`: RPのオリジン
  - `account_id`: 選択された DID
  - `disclosure_text_shown`: 同意文の表示有無
- **レスポンス**:
  - Chrome 141で利用可能な文字列Tokenとして、バージョン、DID、ハンドルを含むJSONをシリアライズして返却する。
  - Tokenに暗号学的な署名は行わず、新しい秘密鍵、公開鍵配布、JWKSエンドポイントは追加しない。
  ```json
  {
    "token": "{\"v\":1,\"did\":\"did:plc:abcdef1234567890\",\"handle\":\"alice.bsky.social\"}"
  }
  ```
- **信頼境界**:
  - Tokenはブラウザが選択結果をRPへ渡すためのデータ形式であり、署名付きID Tokenではない。
  - SDKはTokenの形式と必須フィールドを検証して入力欄へ反映するが、DIDの本人性を保証しない。
  - RPがログインやアカウント連携を行う場合は、返されたハンドルを起点にatproto OAuthを開始し、その結果を本人確認に使用する。

### 4.6 IdP Login Status API
ブラウザが不要なネットワークリクエストを行わないよう、ログイン状態をブラウザに通知する。

- ログイン成功時: HTTPレスポンスヘッダー `Set-Login: logged-in` を返却、またはクライアント側で `navigator.login.setStatus("logged-in")` を実行。
- ログアウト時: HTTPレスポンスヘッダー `Set-Login: logged-out` を返却、または `navigator.login.setStatus("logged-out")` を実行。

---

## 5. クライアントライブラリ設計（`packages/atpassport-client`）

RPサイトに組み込まれる `@atpassport/client` を更新し、FedCM をネイティブにサポートする。

### 5.1 FedCM API呼び出し
```typescript
export async function requestHandleAssist(options?: {
  targetInput?: HTMLInputElement;
  clientId?: string;
}): Promise<{ did: string; handle: string; token?: string } | null> {
  // 1. FedCMが利用可能かチェック
  if (typeof window !== 'undefined' && 'IdentityCredential' in window) {
    try {
      const credential = (await navigator.credentials.get({
        identity: {
          context: 'signin',
          providers: [
            {
              configURL: 'https://atpassport.net/fedcm/config.json',
              clientId: options?.clientId || window.location.origin,
            },
          ],
          mode: 'active', // ユーザージェスチャーを伴うアクティブモード
        },
      } as any)) as { token?: string } | null;

      if (credential?.token) {
        const payload = parseHandleAssistToken(credential.token);
        if (options?.targetInput && payload.handle) {
          fillInputValue(options.targetInput, payload.handle);
        }
        return {
          did: payload.did,
          handle: payload.handle,
          token: credential.token,
        };
      }
    } catch (err) {
      // ユーザーキャンセル、または非対応ケースはフォールバックへ
      console.debug('[atpassport] FedCM bypassed or failed, falling back:', err);
    }
  }

  // 2. フォールバック: 既存のモーダル/ポップアップ連携
  return fallbackModalAssist(options);
}
```

### 5.2 フォーム値の確実な反映
Reactなどのフォーム管理ライブラリと協調するため、ネイティブのプロパティセッターを使用してイベントを発火する：
```typescript
function fillInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus();
}
```

---

## 6. ブラウザ拡張機能との役割分担（`packages/atpassport-extension`）

1. **重複UIの排除**:
   - FedCMが有効な環境ではブラウザがネイティブUIを表示するため、拡張機能によるDOM自動注入は行わない。
2. **フォールバックとツールバー機能の維持**:
   - 拡張機能アイコンをクリックしてハンドル一覧を表示・コピー・入力する標準機能はそのまま維持する。
   - Firefox等、FedCM未対応ブラウザにおける補完として動作する。
3. **Login Status APIの責務**:
   - ログイン状態の通知はIdPであるWeb本体だけが行い、拡張機能には担当させない。

---

## 7. セキュリティとプライバシー検証

1. **Origin Spoofing防止**:
   - `id_assertion_endpoint` では、リクエストの `client_id` と `Origin` ヘッダーが完全に一致することを検証する。
2. **Sec-Fetch-Dest ヘッダーによるCSRF防止**:
   - `/api/fedcm/accounts` および `/api/fedcm/assertion` は、ブラウザ内部リクエストでのみ付与される `Sec-Fetch-Dest: webidentity` を必須とする。通常の Fetch/XHR や画像タグからの偽装呼び出しは即時400/403で遮断する。
3. **入力支援と本人認証の分離**:
   - 返却Tokenはハンドル入力候補の伝達にのみ使用し、本人認証やログインセッションの確立には使用しない。
   - 本人確認が必要なRPは、返されたハンドルを起点にatproto OAuthを実行する。
4. **トラッキング遮断**:
   - ユーザーがブラウザUIで特定アカウントをクリックするまで、RPに対してユーザー情報（ログイン有無を含む）は一切伝達されない。

---

## 8. テスト・検証計画

### 8.1 単体テスト（Vitest）
- `packages/frontend`:
  - `/.well-known/web-identity` および `/fedcm/config.json` の仕様準拠レスポンス検証。
  - `/api/fedcm/accounts` の認証、`Sec-Fetch-Dest: webidentity` 検証、CORS拒否動作。
  - `/api/fedcm/assertion` の `client_id`・`Origin` 検証、文字列Tokenの形式と必須フィールド検証。
  - FedCM専用Cookieの属性、用途制限、有効期限、ログイン時発行、ログアウト時削除を検証。
  - 通常セッションCookieだけではFedCMエンドポイントを利用できず、FedCM専用Cookieが通常の認証には利用できないことを検証。
- `packages/atpassport-client`:
  - `IdentityCredential` の有無に応じた FedCM 実行とフォールバック動作の分岐検証。
  - 入力支援Tokenのバージョン、JSON形式、DID、ハンドルの検証と、不正なTokenを入力欄へ反映しないことの検証。
  - ネイティブ値セットとイベントバブリングの動作検証。

### 8.2 E2Eテスト（Playwright）
Chromium 141以降の環境において Chrome DevTools Protocol (`FedCm` ドメイン) を使用し、正常系だけでなく各種ネガティブコンディション（異常系・拒否系・フォールバック系）を網羅的に検証する。

#### 8.2.1 正常系テスト（Positive Conditions）
- **単一アカウント選択**: ログイン済みユーザーがRP上の入力アシストをクリックし、FedCMダイアログからアカウントを選択して入力欄へ即座にハンドルが反映されること。
- **複数アカウント選択**: 複数DID/ハンドルを所有するユーザーが、ダイアログ上で特定のアカウントを選択し、正しいハンドルが反映されること。
- **Auto-reauthentication**: すでに連携済みのRP再訪時に、ワンタップ／自動でハンドルが入力されること。

#### 8.2.2 ネガティブコンディション・異常系テスト（Negative Conditions）
1. **ユーザーキャンセル・ダイアログ破棄（User Dismissal / Cancellation）**:
   - `FedCm.dismissDialog` を実行してユーザーがEscapeキーや閉じるボタンでダイアログを破棄したケース。
   - `navigator.credentials.get` のPromiseが安全に拒絶（AbortError）され、ページがクラッシュせず、別のUIを自動表示せずに元のフォーム状態を維持すること。
2. **IdP未ログイン状態（Logged-out / Expired Session）**:
   - @passportのセッションCookieが存在しない、または期限切れの状態でRPがリクエスト。
   - `/api/fedcm/accounts` が 401 を返し、ブラウザのログイン促進フローが動作するか、SDKが既存のログインモーダルへフォールバックすること。
3. **登録ハンドル0件（No Registered Handles）**:
   - ログイン済みだが連携DID/ハンドルが1件も存在しないユーザー。
   - `accounts: []` が返却された際、不正な入力が行われず、ハンドル登録への導線またはフォールバックへ遷移すること。
4. **Origin Spoofing / 不正なClient ID（Origin Mismatch）**:
   - 悪意あるRPが別のドメインを `client_id` に指定してリクエストを試行。
   - `/api/fedcm/assertion` で `Origin` と `client_id` の不整合が検知され、400/403 で拒絶されトークンが漏洩しないこと。
5. **ヘッダー偽装・直接アクセス（Missing `Sec-Fetch-Dest`）**:
   - ブラウザ内部FedCM機構外（通常のfetchやscriptタグ等）からの直接呼び出し。
   - `Sec-Fetch-Dest: webidentity` 不在により即時拒絶されること。
6. **ネットワーク障害・サーバーエラー（Network Failure / 500 Error）**:
   - アカウント取得またはアサーション発行時に 500 エラーやタイムアウトが発生するケース。
   - SDKが無処理で停止せず、エラーをトラップして既存のフォールバック入力フローへ引き継ぐこと。
7. **FedCM無効化・非対応環境（Unsupported / Disallowed Environment）**:
   - `window.IdentityCredential` が存在しないブラウザ環境、またはPermissions Policy（`identity-credentials-get`）で制限されたiframe内。
   - 例外をスローせず、即座に既存のモーダル/拡張機能フローへ切り替わること。

### 8.3 総合リポジトリ検証
- 全パッケージの型検査 (`pnpm -r compile` / `tsc`)
- ESLint (`pnpm -r lint`)
- 全ユニットテスト (`pnpm -r test`)
- プロダクションビルド (`pnpm -r build`)
- 依存関係セキュリティ監査 (`pnpm audit` 終了コード 0)

---

## 9. 段階的実装ステップ

- [x] **Phase 1: FedCM IdP コアエンドポイントの実装（`packages/frontend`）**
  - `/.well-known/web-identity` と `/fedcm/config.json` の作成。
  - FedCM専用の `Secure; HttpOnly; SameSite=None` Cookieの発行、検証、削除とCSRF対策の実装。既存の `SameSite=Lax` セッションCookieは変更しない。
  - `/api/fedcm/accounts` ルートの実装（セッション検証、`Sec-Fetch-Dest` 検証）。
  - `/api/fedcm/client_metadata` の実装。
  - `/api/fedcm/assertion` の実装（入力支援用の文字列Token返却）。
  - IdP Login Status API（ログイン・ログアウト時のステータス更新）の反映。
- [x] **Phase 2: クライアントSDKのFedCM対応（`packages/atpassport-client`）**
  - `navigator.credentials.get`（`identity` プロバイダ指定）の統合。
  - 入力欄への値注入およびフォールバック機構の実装。
- [ ] **Phase 3: E2Eテスト・開発者コンソール対応**
  - [x] PlaywrightによるSDK正常系、ユーザーキャンセル、ネットワーク障害のブラウザテスト。
  - [x] 未ログイン、登録ハンドル0件、Origin不整合、ヘッダー欠落、所有権不一致のRoute単体テスト。
  - [ ] 実際のFedCM UIをCDP FedCmで操作するHTTPS・別Originの統合テスト。
  - [x] 既存の確認済みドメインをclient ID登録として利用し、任意の規約・プライバシーURLを確認済みドメイン設定から提供。
- [ ] **Phase 4: ドキュメント整備と検証**
  - [x] 開発者向け導入ガイド（FedCM対応SDKの利用方法）の作成。
  - 実機ブラウザ（Chrome / Edge）での総合検証。

---

## 10. 受け入れ条件

1. Chrome / Edge などの FedCM 対応ブラウザにおいて、RP上の `@atpassport/client` 呼び出しによりブラウザ標準のアカウント選択シートが表示されること。
2. アカウント選択後、入力支援用の文字列Tokenが返却され、対象のハンドル入力欄に値が自動設定されること。Tokenを本人認証やRPのログインセッション確立には使用しないこと。
3. ユーザーキャンセル、IdP未ログイン、登録ハンドル0件、Origin不整合、ネットワーク障害、FedCM非対応環境など、すべてのネガティブコンディションで安全にエラーハンドリングまたはフォールバックが行われ、ページやフォームが破損しないこと。
4. 拡張機能に危険な任意ホスト権限（`https://*/*`）を要求せず、既存のポップアップ機能に回帰がないこと。
5. `pnpm audit`、`pnpm test`、`pnpm build` がすべて警告・エラーなく通過すること。
6. Chrome 141以降ではアカウント情報のハンドルを `username` として扱い、実在しないメールアドレスを生成しないこと。
7. 既存の通常セッションCookieを `SameSite=Lax` のまま維持し、FedCM専用CookieがFedCM以外の認証経路で使用されないこと。
8. 新しいアサーション署名鍵やJWKSを追加せず、本人確認が必要な処理は後続のatproto OAuthで行うこと。
