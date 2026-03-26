# @passport

@passportは、atproto エコシステムにおけるユーザーのハンドル管理を支援するハンドルマネージャーです。

*英語版は [README.md](./README.md) を参照してください。*

## 特徴

- **UUID ベースのセッション管理**: ブラウザセッション (UUID) に対して複数の DID を紐付け可能。
- **署名付き Cookie**: 改ざん防止のための署名付きセッション Cookie (`HttpOnly`, `Secure`)。
- **多言語対応 (i18n)**: 英語、日本語、ポルトガル語、ドイツ語、フランス語、スペイン語をサポート。
- **Mantine UI**: ユーザーインターフェースによるハンドル管理。

## ディレクトリ構造

- `/frontend`: Next.js (App Router) による本体アプリケーション。セットアップやビルドの詳細は [frontend/README.md](./frontend/README.md) を参照してください。
- `/packages/atpassport-client`: 外部アプリケーション向けのクライアントライブラリ。
- `/packages/atpassport-extension`: Chrome/Firefox 向けのブラウザ拡張機能。

## 貢献 (Contributing)
開発、バグ報告、翻訳の提供など、あらゆる形での貢献を歓迎します。詳細は [CONTRIBUTING_ja.md](./CONTRIBUTING_ja.md) を参照してください。

## ライセンス

MIT
