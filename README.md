# AtPassport

AtPassport は、atproto エコシステムにおけるユーザーの ID (DID/Handle) 管理を支援する ID プロバイダーです。

## 特徴

- **UUID ベースのセッション管理**: ブラウザセッション (UUID) に対して複数の DID を紐付け可能。
- **署名付き Cookie**: 改ざん防止のための署名付きセッション Cookie (`HttpOnly`, `Secure`)。
- **JWT による ID 解決**: 外部アプリケーションは AtPassport の API を通じてセキュアにユーザーの DID を取得可能。
- **多言語対応 (i18n)**: 日本語および英語を標準サポート。
- **Mantine UI**: リッチなユーザーインターフェースによるハンドル管理。

## ディレクトリ構造

- `/frontend`: Next.js (App Router) による本体アプリケーション。
- `/packages/atpassport-client`: 外部アプリケーション向けのクライアントライブラリ。

## セットアップ

### 依存関係のインストール

```bash
pnpm install
```

### 環境変数の設定 (`frontend/.env.local`)

```env
# AWS DynamoDB
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=AtPassportSessions
# (ローカル開発時のみ)
# DYNAMODB_ENDPOINT=http://localhost:8000

# セッション管理
SESSION_SECRET=your-secure-session-secret

# JWT 署名 (RS256 秘密鍵)
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

### ビルド

```bash
pnpm build
```

## クライアントライブラリの使用例 (`@atpassport/client`)

外部アプリケーションから AtPassport を利用する場合、以下のライブラリを使用します。

```typescript
import { AtPassport } from '@atpassport/client';

const passport = new AtPassport({
  baseUrl: 'https://atpassport.net', // Optional, default is https://atpassport.net
  callbackUrl: 'https://myapp.com/callback' // Required
});

// 1. 認証 URL と atpstate の生成 (OAuth のようなフロー)
const { url, atpstate } = passport.generateAuthUrl({
  redirect_uri: 'https://myapp.com/dashboard' // 任意のカスタムパラメータ
});

// atpstate は CSRF 対策のためセッションや Cookie に保存し、
// callback 受信時に検証することを推奨します。
// window.location.assign(url);

// 2. コールバックで受け取った情報をパースする
const { handle, did, pdsUrl, atpstate: receivedState, customParams } = passport.parseCallback(window.location.href);
console.log(handle, did, customParams.redirect_uri);

```

## ライセンス

MIT
