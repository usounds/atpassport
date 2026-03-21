# @passport

@passportは、atproto エコシステムにおけるユーザーのハンドル管理を支援するハンドルマネージャーです。

*英語版は [README.md](./README.md) を参照してください。*

## 特徴

- **UUID ベースのセッション管理**: ブラウザセッション (UUID) に対して複数の DID を紐付け可能。
- **署名付き Cookie**: 改ざん防止のための署名付きセッション Cookie (`HttpOnly`, `Secure`)。
- **多言語対応 (i18n)**: 日本語および英語を標準サポート。
- **Mantine UI**: ユーザーインターフェースによるハンドル管理。

## ディレクトリ構造

- `/frontend`: Next.js (App Router) による本体アプリケーション。セットアップやビルドの詳細は [frontend/README.md](./frontend/README.md) を参照してください。
- `/packages/atpassport-client`: 外部アプリケーション向けのクライアントライブラリ。
- `/atpassport-extension`: Chrome / Firefox 向けのブラウザ拡張機能。

## ライセンス

MIT
