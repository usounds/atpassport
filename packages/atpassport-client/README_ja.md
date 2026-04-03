# @atpassport/client

[@passport](https://atpassport.net) は、atproto エコシステム向けの各アプリケーションでハンドル入力を不要とするためのサービスです。
このクライアントライブラリを使うことで、あなたのWebアプリに、@passport を利用した「ハンドル入力のアシスト機能」を組み込むことができます。

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
import { AtPassport } from '@atpassport/client/core';

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
import { AtPassportUI } from '@atpassport/client/ui';

// 日本語のテキスト
console.log(AtPassportUI.ja.title); // "@passportでログイン"
console.log(AtPassportUI.ja.description); // "@passportは、各atprotoアプリでハンドルを都度入力する手間が省ける共通ハンドルマネージャーです。"

// 英語のテキスト
console.log(AtPassportUI.en.title); // "Login with @passport"
console.log(AtPassportUI.en.description); // 英語の説明文...

// Standard Icon (SVG String)
const svgString = AtPassportUI.iconSvg;

// React Component
import { AtPassportIcon } from '@atpassport/client/ui';

// Use it in your React component
// <AtPassportIcon size={24} />
```

---

## パラメータ・プレースホルダーの解説

@passport からコールバック URL にリダイレクトされる際、以下の情報が URL パラメータとして付与されます。

### 基本パラメータ（`parseCallback` で自動取得されるもの）
- **`handle`**: 認証されたユーザーの Bluesky / atproto ハンドル名（例: `alice.bsky.social`）
- **`did`**: ユーザーの分散型識別子（DID）。（例: `did:plc:xxxxxxxx`。ハンドルの解決やPDSとの通信に利用します）
- **`pdsurl`**: ユーザーのデータが保存されている PDS (Personal Data Server) のエンドポイント URL。
- **`atpstate`**: `generateAuthUrl()` で自動生成された CSRF 防止用のステート文字列。リクエスト元の検証に用います。

※ `@atpassport/client` を使った標準の `generateAuthUrl` → `parseCallback` フローでは、@passport は安全に `&handle=...` のように標準的なクエリパラメータとして追記する形を採っているため、`parseCallback()` を使うことで、全ての情報を簡単に受け取ることができます。
