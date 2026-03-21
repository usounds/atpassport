# @atpassport/client

[@passport](https://atpassport.net) は、atproto エコシステム向けの認証プロバイダーです。
このクライアントライブラリを使うことで、あなたのアプリケーション（ブラウザ拡張機能やWebアプリ）に、@passport を利用した「ハンドル入力のアシスト機能」を簡単に組み込むことができます。

*For the English documentation, please see [README.md](./README.md).*

## 特徴
- 依存関係ゼロ（Zero dependencies）
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
  callbackUrl: 'https://myapp.com/oauth/login' // 必須: 認証後に戻ってくるURL
});

// 2. (任意)認証URLの生成とリダイレクト
// カスタムパラメータ（例: ログイン後に元いたページに戻すための redirect_uri など）を指定できます
const { url, atpstate } = passport.generateAuthUrl({
  redirect_uri: '/dashboard'
});

// 3.(任意)セキュリティのため、発行された atpstate をセッションや sessionStorage 等に保存します
sessionStorage.setItem('atpstate', atpstate);

// 4. @passport のハンドル選択画面へリダイレクト
window.location.assign(url);
```

```typescript
// コールバック先 (https://myapp.com/oauth/callback) でのパラメータ受け取り
// (任意)保存していた atpstate を第2引数に渡すことで、状態が不一致（CSRFの疑い）の場合はエラー（例外）が発生します
const savedState = sessionStorage.getItem('atpstate');
const result = passport.parseCallback(window.location.href, savedState);

console.log('ログイン成功:', result);
console.log('認証ユーザー:', result.handle);
console.log('カスタムパラメータ:', result.customParams['redirect_uri']); // '/dashboard' が取れる
```

## UI組み込み用の標準テキスト・アイコン

開発者が独自のUI（例: 「@passportでログイン」ボタン）を実装しやすいように、多言語の標準テキストとSVGアイコンの定数 `AtPassportUI` をエクスポートしています。

```typescript
import { AtPassportUI } from '@atpassport/client';

// 日本語のテキスト
console.log(AtPassportUI.ja.title); // "@passportでログイン"
console.log(AtPassportUI.ja.description); // "@passportは、各atprotoアプリでハンドルを都度入力する手間を省ける共通ハンドルマネージャーです。"

// 英語のテキスト
console.log(AtPassportUI.en.title); // "Login with @passport"
console.log(AtPassportUI.en.description); // 英語の説明文...

// 標準アイコン（SVG文字列 - lucide-react の TicketsPlane と同等）
// HTML にそのまま埋め込んだり、Reactの dangerouslySetInnerHTML で利用できます
const svgString = AtPassportUI.iconSvg;
```

---

## パラメータ・プレースホルダーの解説

@passport からコールバック URL にリダイレクトされる際、以下の情報が URL パラメータとして付与されます。

### 基本パラメータ（`parseCallback` で自動取得されるもの）
- **`handle`**: 認証されたユーザーの Bluesky / atproto ハンドル名（例: `alice.bsky.social`）
- **`did`**: ユーザーの分散型識別子（DID）。（例: `did:plc:xxxxxxxx`。ハンドルの解決やPDSとの通信に利用します）
- **`pdsurl`**: ユーザーのデータが保存されている PDS (Personal Data Server) のエンドポイント URL。
- **`atpstate`**: `generateAuthUrl()` で自動生成された CSRF 防止用のステート文字列。リクエスト元の検証に用います。

### `{handle}` などのプレースホルダー置換機能
特定のエンドポイントを利用した連携や、組み込み先のクライアント実装次第では、`callbackUrl` 内に `{handle}` や `{did}` といった文字列（プレースホルダー）を含めておくことで、認証完了時に @passport 側でユーザーの実際のハンドルや DID に**動的に文字列置換**されてリダイレクトされる機能があります。

**例:**
`callbackUrl` を `https://myapp.com/login?handle={handle}` にして @passport へ送ると、完了時に `https://myapp.com/login?handle=alice.bsky.social` として戻ってきます。

※ `@atpassport/client` を使った標準の `generateAuthUrl` → `parseCallback` フローでは、@passport はプレースホルダー置換ではなく、安全に `&handle=...` のように標準的なクエリパラメータとして追記する形を採っているため、意識せずに `parseCallback()` だけで全ての情報を簡単に安全に受け取ることができます。
