# Step 2 設計仕様書: 拡張機能ローカルストレージ連携・サーバーAssertion検証緩和

## 1. 概要と目的

Step 1 では、Webフロントエンドにおける W3C **IdP Registration API**（`IdentityProvider.register` / `unregister`）および **Accounts Push**（`navigator.login.setStatus('logged-in', { accounts })`）のUIと同期基盤を実装しました。

**Step 2** の目的は以下の2点です：
1. **サーバー側のAssertion検証緩和（IdP Registrationモデル対応）**:
   未登録の任意のサードパーティRP（Webサイト）からFedCMアサーション要求があった場合でも、`origin === client_id` かつ 有効なHTTPSオリジンであれば、公開情報である Handle Assist トークン（`{ v: 1, did, username }`）を発行できるよう検証ルールを緩和する。
2. **Firefox拡張機能側のストレージ連携 & 正規アサーション統合**:
   - WebフロントエンドでPushされたアカウント情報を Firefox拡張機能の `browser.storage.local` に安全に保持する。
   - RP側でアカウント選択時、拡張機能内でローカル生成していたモックトークンを撤廃し、Step 0 で検証済みの `declarativeNetRequest`（`Sec-Fetch-Dest: webidentity` 自動付与）経由で、正規のサーバーエンドポイント **`/api/fedcm/assertion`** を呼び出してトークンを取得・返却する。

---

## 2. 変更対象と全体アーキテクチャ

```mermaid
sequenceDiagram
    autonumber
    participant Web as AtPassport Web (IdP)
    participant ExtCont as Extension (Content Script / Polyfill)
    participant ExtBG as Extension (Background)
    participant ExtStore as browser.storage.local
    participant RP as 利用側サイト (RP)
    participant Server as /api/fedcm/assertion

    Note over Web,ExtStore: 【フェーズ1: Accounts Push 同期】
    Web->>ExtCont: navigator.login.setStatus('logged-in', { accounts })
    Note over ExtCont: 悪意あるRPによる注入防止のため、Origin が AtPassport か厳格チェック
    ExtCont->>ExtBG: メッセージ: SAVE_PUSHED_ACCOUNTS { origin, accounts }
    Note over ExtBG: sender.tab.url / origin を二重検証
    ExtBG->>ExtStore: アカウント一覧をローカル保存 (秘密情報なし)

    Note over RP,Server: 【フェーズ2: RP上でのアサーション要求】
    RP->>ExtCont: navigator.credentials.get({ identity: { ... } })
    ExtCont->>ExtBG: メッセージ: GET_STORED_ACCOUNTS { configURL }
    ExtBG->>ExtStore: 保存アカウント取得
    ExtBG-->>ExtCont: accounts 返却 (Zero-Network)
    ExtCont->>ExtCont: ネイティブ風アカウント選択シート表示
    Note over ExtCont: ユーザーがアカウントを選択

    Note over ExtCont,Server: 【CORS プリフライト (OPTIONS)】
    ExtCont->>Server: OPTIONS /api/fedcm/assertion (Origin: RP)
    Server-->>ExtCont: 200 OK (CORS Headers 許可)

    Note over ExtCont,Server: 【アサーション要求 (POST)】
    ExtCont->>Server: POST /api/fedcm/assertion (client_id=RP_Origin, account_id=DID)<br/>※ DNRが Sec-Fetch-Dest: webidentity をネットワーク層で自動注入
    Server->>Server: validateFedCmClient: origin === client_id 確認 (未登録RPも許可)
    Server-->>ExtCont: 200 OK { token: "{\"v\":1,\"did\":\"...\",\"username\":\"...\"}" }
    ExtCont-->>RP: IdentityCredential { token } 返却
```

---

## 3. 詳細設計

### 3.1 サーバー側: Assertion検証の緩和 (`packages/frontend`)

#### 現状の課題
[`packages/frontend/src/lib/fedcm.ts`](file:///Users/usounds/Program/AtPassport/packages/frontend/src/lib/fedcm.ts) の `validateFedCmClient` は、116行目で `return registration ? { origin, registration } : null;` となっており、「データベースの `verified_domains`（ドメイン所有権確認済みテーブル）に事前登録されたドメイン」または「自ドメイン/開発localhost」のみを許可し、それ以外は `null`（403 Forbidden）を返しています。

#### 緩和ルール（IdP Registration モデル準拠）
W3C IdP Registration 仕様では、ユーザーがブラウザにIdPを登録した場合、世界中のあらゆる未登録RPからFedCMを利用できます。
AtPassportが発行するトークンは、認証チケットや秘密情報ではなく、公開情報であるDIDとハンドル名（`{ v: 1, did, username }`）に過ぎません（本人の認証は後続の atproto OAuth が担保）。

そのため、以下の条件を満たす場合は未登録RPであってもリクエストを承認します：

1. **`originHeader === clientId` の完全一致**:
   ブラウザが改ざん不能なHTTPヘッダーとして付与する `Origin` と、POSTボディの `client_id` が完全に一致していること（クロスオリジンのなりすまし防止）。
2. **正当なHTTPSオリジンであること**:
   `normalizeClientOrigin` を通過する正規のHTTPS URL（またはローカル開発環境のループバックHTTP）であること。
3. **戻り値の変更**:
   未登録RPの場合、`registration: null` としてクライアント情報を返す：
   ```typescript
   export async function validateFedCmClient(
     originHeader: string | null,
     clientId: string | null,
   ): Promise<{ origin: string; registration: VerifiedDomain | null } | null> {
     const origin = normalizeClientOrigin(originHeader);
     const normalizedClientId = normalizeClientOrigin(clientId);
     if (!origin || !normalizedClientId || origin !== normalizedClientId) {
       return null;
     }

     if (origin === "https://atpassport.net") {
       return { origin, registration: null };
     }

     const { hostname } = new URL(origin);
     const isLoopback =
       hostname === "localhost" ||
       hostname === "127.0.0.1" ||
       hostname === "[::1]" ||
       hostname.endsWith(".localhost");
     if (isLoopback && process.env.NODE_ENV !== "production") {
       return { origin, registration: null };
     }

     // 認証済みドメイン情報を取得（存在すれば紐付け、存在しなくても有効なHTTPSオリジンなら許可）
     const registration = await getFedCmClientRegistration(origin);
     return { origin, registration };
   }
   ```
4. **CORS プリフライト（OPTIONS）ハンドラーの追加**:
   サードパーティRP（Content Script）から `credentials: 'include'` 付きでクロスオリジンfetchを行う場合、ブラウザは必ずプリフライト `OPTIONS` リクエストを送信します。
   [`packages/frontend/src/app/api/fedcm/assertion/route.ts`](file:///Users/usounds/Program/AtPassport/packages/frontend/src/app/api/fedcm/assertion/route.ts) に `OPTIONS` ハンドラーを追加し、200 OK と適切なCORSヘッダーを返却します：
   ```typescript
   export async function OPTIONS(request: Request) {
     const origin = request.headers.get("origin");
     const normalizedOrigin = normalizeClientOrigin(origin);
     if (!normalizedOrigin) {
       return new Response(null, { status: 400 });
     }
     return new Response(null, {
       status: 200,
       headers: {
         ...fedCmCorsHeaders(normalizedOrigin),
         "Access-Control-Allow-Methods": "POST, OPTIONS",
         "Access-Control-Allow-Headers": "Content-Type",
         "Access-Control-Max-Age": "86400",
       },
     });
   }
   ```
5. **影響範囲**:
   - `/api/fedcm/assertion`: 未登録RPでも 200 OK で Handle Assist トークンが取得可能になる。
   - `/api/fedcm/client_metadata`: 認証済みドメインのみブランディング（利用規約・プライバシーポリシーURL）を返し、未登録ドメインには空のメタデータを返す（既存挙動を維持）。

---

### 3.2 Firefox拡張機能: ローカルストレージ連携 (`packages/atpassport-extension`)

#### 1. 権限追加 (`wxt.config.ts`)
拡張機能の `manifest.json` に `"storage"` 権限を追加します。
```typescript
permissions: [
  'activeTab',
  'storage',
  // firefox only
  ...(process.env.TARGET_BROWSER === 'firefox' ? ['declarativeNetRequest'] : [])
]
```

#### 2. ストレージ管理モジュール (`src/lib/accountStorage.ts`)
保存するアカウントスキーマを定義し、CRUDヘルパーを提供します：

```typescript
export interface StoredAccount {
  id: string; // did:plc:...
  name: string; // 表示名 または ハンドル
  username: string; // @handle.bsky.social
  picture?: string; // アバター画像URL
}

export interface StoredIdpEntry {
  origin: string; // e.g. "https://atpassport.net"
  accounts: StoredAccount[];
  updatedAt: number;
}

export const STORAGE_KEY_PREFIX = 'fedcm_idp_accounts:';
```
- **秘密情報の非保持**: Cookie値、セッションJWT、OAuthトークン等は一切ストレージに保存しない。公開アカウント情報のみを保持。
- **オリジン分離**: IdPのオリジン（`https://atpassport.net` や `https://dev.atpassport.net`、`http://localhost:3000`）ごとに分離して保存。
- **ログアウト時**: `accounts` が空配列または `logged-out` の場合、対象オリジンのエントリを安全に削除。

#### 3. Main World での `navigator.login.setStatus` インターセプトと悪意ある注入防止
`fedcm.content.ts`（Main Worldに注入されるインラインPolyfill）において：
- `navigator.login` が存在しない場合は初期化し、`setStatus` をラップ：
  ```javascript
  if (!navigator.login) {
    navigator.login = {};
  }
  var origSetStatus = navigator.login.setStatus ? navigator.login.setStatus.bind(navigator.login) : null;
  navigator.login.setStatus = function(status, options) {
    // 拡張機能側のブリッジイベントを発火
    try {
      window.dispatchEvent(new CustomEvent('atpassport-fedcm-setstatus', {
        detail: JSON.stringify({ status: status, options: options })
      }));
    } catch (e) {}
    if (origSetStatus) {
      return origSetStatus(status, options);
    }
    return Promise.resolve();
  };
  ```
- **セキュリティ要件（偽アカウント注入攻撃の防止）**:
  `fedcm.content.ts` は `<all_urls>` で動作するため、悪意ある第三者サイトが `atpassport-fedcm-setstatus` イベントを偽装してユーザーの拡張ストレージを汚染するリスクがあります。
  - **Content Script側の検証**: イベント受信時、`isAtPassportDomain(window.location.hostname)` を確認し、AtPassportドメイン（`atpassport.net`、`*.atpassport.net`、開発用 `localhost` 等）以外のページからのPushイベントは **即座に破棄** する。
  - **Background Script側の検証**: メッセージ受信時、`sender.tab?.url` または `sender.origin` が正当なAtPassportオリジンであることを二重検証する。

---

### 3.3 Firefox拡張機能: サーバーAssertion連携

#### 現状の課題
現在 `packages/atpassport-extension/src/entrypoints/fedcm.content.ts` の `showFedCmPrompt` は、ユーザーがアカウントを選択した際、JavaScript内でローカルに以下を組み立てて返しています：
```javascript
const fakeToken = JSON.stringify({
  v: 1,
  did: selectedAccount.id,
  username: selectedAccount.name
});
resolve({ token: fakeToken });
```
これは完全なローカルモックであり、サーバーとの整合性検証（セッションや関連付けの存在確認）が行われていませんでした。

#### 正規エンドポイント `/api/fedcm/assertion` への接続
Step 0 で導入・実機検証した `declarativeNetRequest` ルール（ルールID 1001）により、拡張機能から `https://atpassport.net/api/fedcm/*` へのリクエストにはブラウザネットワーク層で `Sec-Fetch-Dest: webidentity` が自動注入されます。

アカウント選択時の処理フロー：
1. ユーザーがポップアップでアカウントを選択。
2. 対象IdPの `id_assertion_endpoint`（例: `${idpOrigin}/api/fedcm/assertion`）に対して Content Script から `fetch` を実行：
   ```typescript
   const formData = new URLSearchParams();
   formData.append('client_id', window.location.origin);
   formData.append('account_id', selectedAccount.id);

   const response = await fetch(idAssertionEndpoint, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/x-www-form-urlencoded',
     },
     body: formData.toString(),
     credentials: 'include', // SameSite=None な FedCM セッションCookieを送信
   });
   ```
3. **実行コンテキストに関する考慮とCSPハンドリング**:
   - Content Script から実行することで、HTTP `Origin` ヘッダーが正しく RP ドメイン（`window.location.origin`）となり、サーバー側の `origin === client_id` 検証に合格します。
   - もしRPが非常に厳格な `Content-Security-Policy: connect-src` を設定している場合、ブラウザによって `atpassport.net` へのfetchがブロックされる可能性があります。その場合、fetchは例外（TypeError）となるため、Polyfill側で適切にキャッチし、RP側の既存Webリダイレクトフォールバックへ委ねる（動作を破壊しない）。
4. **サーバー応答の検証**:
   - `200 OK`: レスポンスの `{ token }` を取り出し、`IdentityCredential` オブジェクトとして RP の `navigator.credentials.get` Promise を解決。
   - `401 Unauthorized` / `403 Forbidden` / 通信エラー: サーバー側でセッション失効またはアカウント不一致と判定された場合、偽のトークンは発行せず、適切な例外（`NetworkError`）をスローしてRP側のフォールバック処理に委ねる。

---

## 4. 変更ファイル一覧

| パッケージ | ファイルパス | 変更区分 | 内容 |
|---|---|---|---|
| `frontend` | `src/lib/fedcm.ts` | 変更 | `validateFedCmClient` を改修し、`origin === client_id` かつ 有効HTTPSオリジンであれば未登録RPでも承認 |
| `frontend` | `src/app/api/fedcm/assertion/route.ts` | 変更 | `OPTIONS` CORSプリフライトハンドラーを追加 |
| `frontend` | `src/lib/__tests__/fedcm.test.ts` | 変更 | 未登録RPでの検証承認テストケースを追加 |
| `frontend` | `src/app/api/fedcm/assertion/__tests__/route.test.ts` | 変更 | 未登録RPに対するアサーション成功およびOPTIONSプリフライトのテストケースを追加 |
| `atpassport-extension` | `wxt.config.ts` | 変更 | permissions に `"storage"` を追加 |
| `atpassport-extension` | `src/lib/accountStorage.ts` | 新規 | `browser.storage.local` を用いたアカウント保存・取得・削除ヘルパー |
| `atpassport-extension` | `src/lib/__tests__/accountStorage.test.ts` | 新規 | ストレージ管理ヘルパーの単体テスト |
| `atpassport-extension` | `src/entrypoints/background.ts` | 変更 | `SAVE_PUSHED_ACCOUNTS`, `GET_STORED_ACCOUNTS` メッセージハンドラーの追加（`sender.origin` 検証含む） |
| `atpassport-extension` | `src/entrypoints/fedcm.content.ts` | 変更 | ① `login.setStatus` インターセプトとオリジン検証付きPush同期<br/>② ローカル保存アカウントの表示<br/>③ アカウント選択後の `/api/fedcm/assertion` 呼び出し |

---

## 5. テスト計画

### 5.1 単体テスト (Vitest)
1. **サーバー側 `validateFedCmClient`**:
   - 未登録の HTTPS RP（例: `https://unregistered-rp.example`）で `origin === client_id` の場合に `{ origin, registration: null }` が返ること。
   - `origin !== client_id` のなりすまし要求で `null`（拒否）となること。
   - 不正なプロトコル（HTTP）や不正なフォーマットで拒否されること。
2. **サーバー側 `/api/fedcm/assertion`**:
   - `OPTIONS` プリフライトに対して 200 OK と正規CORSヘッダーが返ること。
   - 未登録RPからのPOSTリクエストに対して、セッションとアカウントが一致していれば `200 OK` でトークンが返ること。
3. **拡張機能 `accountStorage`**:
   - アカウントの保存、取得、空配列によるログアウト削除が正常に行われること。
4. **拡張機能のセキュリティ検証**:
   - 非AtPassportオリジンからのPushイベントがContent Script/Backgroundで拒絶されること。

### 5.2 統合・E2Eテスト
1. **Frontend Playwright E2E**:
   - 既存のE2Eテストスイートがすべて通過すること。
2. **Firefox拡張機能ビルド & 実機検証**:
   - `pnpm --filter atpassport-extension build:firefox` が正常終了すること。
   - FirefoxでAtPassportを開き、ハンドルが `browser.storage.local` に保存されること。
   - 任意の外部RP（またはデモページ）で「@passportで選択」をクリックした際、保存アカウントからネイティブ風UIが表示され、選択時に `/api/fedcm/assertion` にPOSTされて正規トークンが入力欄に補完されること。

---

## 6. 次のアクション

ユーザーによる本設計仕様書のレビュー・承認後、以下の順序で実装を進めます：
1. サーバー側の検証緩和とOPTIONSハンドラー追加（`fedcm.ts`, `assertion/route.ts` & テスト）
2. 拡張機能の `storage` 権限と `accountStorage.ts` の実装
3. 拡張機能の `background.ts` と `fedcm.content.ts` の同期・Assertion接続
4. ビルドと実機検証
