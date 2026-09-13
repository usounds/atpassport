# @atpassport/client

[@passport](https://atpassport.net) は、atproto エコシステム向けの各アプリケーションでハンドル入力を不要とするためのサービスです。
このクライアントライブラリを使うことで、あなたのWebアプリに、@passport を利用した「ハンドル入力のアシスト機能」を組み込むことができます。

*For the English documentation, please see [README.md](./README.md).*

## 特徴
- パッケージルートに統合した単一API
- OAuthライクなセキュアな連携フロー（CSRF対策のための `atpstate` 対応）
- 複数のカスタムパラメータの引き回し（コールバックに付与したパラメータが自動で返却されます）

## インストール

```bash
npm install @atpassport/client
# or
pnpm add @atpassport/client
```

## 使い方

```typescript
import { AtPassport } from '@atpassport/client';

// 1. クライアントの初期化
const passport = new AtPassport({
  callbackUrl: 'https://myapp.com/api/atpassport/callback', // 必須: 認証後に戻ってくるURL
  lang: 'ja', // 任意: 'en', 'ja', 'pt', 'de', 'fr', 'es'
  requiredParams: { returnTo: 'string' } // 任意：　必須パラメータを定義
});

// 2. 認証URLの生成と atpstate (CSRF対策用) の取得
// requiredParamsで定義したパラメータは必須となります
const { url, atpstate } = passport.generateAuthUrl({
  returnTo: window.location.href
});

// 3. セキュリティのため、発行された atpstate をクッキー等に保存します
document.cookie = `atpstate=${atpstate}; path=/; max-age=600; SameSite=Lax`;

// 4. @passport のハンドル選択画面へリダイレクト
window.location.href = url;
```

```typescript
// コールバック先 (Next.js の API Route 例（https://myapp.com/api/atpassport/callback）) でのパラメータ受け取り

export async function GET(req: Request) {
  const url = new URL(req.url);
  const expectedState = getCookie(req, 'atpstate'); // クッキーから保存済みステートを取得
  
  try {
    const result = passport.parseCallback(req.url, expectedState);
    
    console.log('ハンドル:', result.handle);
    console.log('カスタムパラメータ:', result.customParams.returnTo);
    
    // OAuth フローの継続...（各OAuthライブラリのauthorizeを受け取ったresult.handleで継続する）
    const authUrl = await client.authorize(result.handle);

  } catch (err) {
    console.error('ログイン処理に失敗しました:', err);
  }
}
```

## UI組み込み用の標準テキスト・アイコン

開発者が独自のUI（例: 「@passportでログイン」ボタン）を実装しやすいように、多言語の標準テキストとSVGアイコンの定数 `AtPassportUI` をエクスポートしています。

```typescript
import { AtPassportIcon, AtPassportUI } from '@atpassport/client';

// 日本語のテキスト
console.log(AtPassportUI.ja.title); // "@passportでログイン"
console.log(AtPassportUI.ja.description); // "@passportは、各atprotoアプリでハンドルを都度入力する手間が省ける共通ハンドルマネージャーです。"

// 英語のテキスト
console.log(AtPassportUI.en.title); // "Login with @passport"
console.log(AtPassportUI.en.description); // 英語の説明文...

// Standard Icon (SVG String)
const svgString = AtPassportUI.iconSvg;

// Use it in your React component
// <AtPassportIcon size={24} />
```

## FedCM（ブラウザ標準アカウント選択）による入力アシスト

Chrome / Chromium 141 以降のブラウザでは、W3C 標準の **FedCM (Federated Credential Management API)** を利用したネイティブなアカウント選択シートを表示できます。
ユーザーはブラウザのUIから登録済みのハンドルをワンタップで選択でき、拡張機能のインストールや外部サイトへのモーダルリダイレクトなしにスムーズに入力アシストを受けられます。

### 1. 基本的な使い方

`requestHandleAssist()` に `fallback` を渡すことで、FedCM対応ブラウザ（Chrome等）ではネイティブダイアログが、非対応ブラウザ（Safari, Firefox等）ではWebリダイレクト認証が自動で動作します。

```typescript
import { AtPassport } from '@atpassport/client';

const passport = new AtPassport({
  callbackUrl: 'https://myapp.com/api/atpassport/callback',
  fedcm: true,
});

button.addEventListener('click', async () => {
  const input = document.querySelector<HTMLInputElement>('input[name="handle"]');

  const result = await passport.requestHandleAssist({
    targetInput: input ?? undefined,
    fallback: async () => {
      // 非対応ブラウザ用: 従来のWeb認証ページへリダイレクト
      const { url, atpstate } = passport.generateAuthUrl();
      document.cookie = `atpstate=${atpstate}; path=/; max-age=600; SameSite=Lax`;
      window.location.href = url;
      return null;
    },
  });

  if (result) {
    console.log('選択されたユーザー名:', result.username);
    console.log('DID:', result.did);
  }
});
```

> [!TIP]
> **`passport.isHandleAssistSupported()` について**:
> 「全ブラウザ共通のログインボタン」では上記のように常にボタンを表示して `fallback` に任せる設計を推奨します。`isHandleAssistSupported()` は、入力欄の右端に「ブラウザ標準で補完する」専用のアイコンボタンなどを条件付きで追加表示したい場合に利用してください。

### 2. 受け取りデータの仕様 (`HandleAssistResult`)

`requestHandleAssist()` が成功すると、以下のプロパティを含むオブジェクトが返されます（利用者がダイアログを閉じた場合は `null`）：

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `username` | `string` | 選択された Bluesky / atproto ハンドル名・ユーザー名（例: `alice.bsky.social`） |
| `did` | `string` | ユーザーの Decentralized Identifier（例: `did:plc:12345...`） |
| `token` | `string` | FedCM アサーション文字列（シリアライズされたJSON） |

> [!NOTE]
> - **自動入力 (`targetInput`)**: `targetInput` に `<input>` 要素を指定した場合、選択完了時にユーザー名（ハンドル）の入力および `input` / `change` イベントの発行が自動で行われます（React等のステート管理とも正しく同期されます）。
> - **キャンセル時の挙動**: ユーザーがブラウザのアカウント選択ダイアログを閉じた場合（Escキーやダイアログ外クリック）、`fallback` は発火せず静かに `null` を返します。これにより、キャンセル時に不要なフォールバック画面が勝手に開くのを防ぎます。
> - **セキュリティ境界**: 返却されるユーザー名は入力支援（ログインヒント）です。利用者がそのアカウントを正当に所持しているかの最終確認や PDS アクセスが必要な場合は、必ず返されたユーザー名を起点に atproto OAuth フローを完了させてください。

### 3. 本番利用におけるドメイン確認

本番環境で FedCM を利用するには、利用側Webサイトの Origin が [@passport 開発者ポータル](https://atpassport.net/developers/verify) で所有権確認（DNS TXTレコードまたは HTTP ファイル検証）されている必要があります。
ドメイン確認を完了すると、ブラウザのアカウント選択ダイアログに利用規約やプライバシーポリシーのリンクを表示させることも可能です。

---

## パラメータ・プレースホルダーの解説

@passport からコールバック URL にリダイレクトされる際、以下の情報が URL パラメータとして付与されます。

### 基本パラメータ（`parseCallback` で自動取得されるもの）
- **`username`**: 認証されたユーザーの Bluesky / atproto ハンドル名・ユーザー名（例: `alice.bsky.social`）
- **`did`**: ユーザーの分散型識別子（DID）。（例: `did:plc:xxxxxxxx`。ハンドルの解決やPDSとの通信に利用します）
- **`pdsurl`**: ユーザーのデータが保存されている PDS (Personal Data Server) のエンドポイント URL。
- **`atpstate`**: `generateAuthUrl()` で自動生成された CSRF 防止用のステート文字列。リクエスト元の検証に用います。

※ `@atpassport/client` を使った標準の `generateAuthUrl` → `parseCallback` フローでは、@passport は安全に `&username=...` のように標準的なクエリパラメータとして追記する形を採っているため、`parseCallback()` を使うことで、全ての情報を簡単に受け取ることができます。
