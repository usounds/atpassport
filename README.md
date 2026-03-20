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

const passport = new AtPassport(
  'https://atpassport.us/',
  '...' // AtPassport の公開鍵 (Optional for URL generation, Required for get)
);

// 1. ハンドルを登録させる (リダイレクト用 URL 生成)
const registerUrl = passport.registerUrl('alice.bsky.social', 'https://myapp.com/callback');

// 2. 現在のセッションの DID を解決する (リダイレクト用 URL 生成)
const resolveUrl = passport.resolveUrl('https://myapp.com/callback');

// 3. コールバックで受け取ったトークンからセッション情報を取得する
// (URL: https://myapp.com/callback?token=...)
const session = await passport.get(token);
console.log(session.did, session.handle);
```

## ライセンス

MIT
