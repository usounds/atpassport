# @passport

@passportは、atproto エコシステムにおけるユーザーのハンドル管理を支援するハンドルマネージャーです。

*英語版は [README.md](./README.md) を参照してください。*

## 特徴

- **UUID ベースのセッション管理**: ブラウザセッション (UUID) に対して複数の DID を紐付け可能。
- **署名付き Cookie**: 改ざん防止のための署名付きセッション Cookie (`HttpOnly`, `Secure`)。
- **JWT による ID 解決**: 外部アプリケーションは @passport の API を通じてセキュアにユーザーの DID を取得可能。
- **多言語対応 (i18n)**: 日本語および英語を標準サポート。
- **Mantine UI**: ユーザーインターフェースによるハンドル管理。

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
# セッション管理
SESSION_SECRET=your-secure-session-secret
```

### ビルド

```bash
pnpm build
```

## クライアントライブラリ (`@atpassport/client`)

外部アプリケーションから @passport を利用するためのクライアントライブラリを提供しています。
詳細は [packages/atpassport-client/README.md](./packages/atpassport-client/README.md) を参照してください。

## ライセンス

MIT
