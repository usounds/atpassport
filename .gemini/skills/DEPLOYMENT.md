# Deployment Skill (Full Automation)

このスキルは、@passportのフロントエンド、パッケージ、およびブラウザ拡張機能のデプロイプロセスを完全に自動化して管理します。

## コマンド: /deploy preview

ユーザーから指示があった場合、以下のフローを一気通貫で実行してください。
基本的にすべての作業は `preview` ブランチで行い、デプロイ先は production です。

### 1. 変更検知と整合性チェック（自動実行）
1. **変更箇所の特定**: `git status` および `git diff --name-only HEAD` を実行。
2. **コミット状態の確認**: 未コミットの変更がある場合は、変更内容に適したメッセージで自動コミットする。
   - すべてコミットされている場合のみ次へ進む。

### 2. フロントエンドのデプロイフロー（自動実行）
`frontend/` に変更がある場合に実行します。
1. **ディレクトリ移動**: `cd frontend`
2. **準備**: `pnpm lint` と `pnpm test` を実行。
3. **ビルド確認**: `pnpm run build`
4. **デプロイ**: `pnpm run deploy`
5. **プッシュ**: `git push`

### 3. パッケージのデプロイフロー（自動実行）
`packages/atpassport-client/` に変更がある場合に実行します。
1. **ディレクトリ移動**: `cd packages/atpassport-client`
2. **テスト実行**: `pnpm run test`
3. **ビルド**: `pnpm run build`
4. **npm更新**: `pnpm run deploy` (ユーザーの認証を待機)
5. **プッシュ**: `git push`

### 4. ブラウザ拡張機能のデプロイフロー（自動実行）
`packages/atpassport-extension/` に変更がある場合に実行します。
1. **ディレクトリ移動**: `cd packages/atpassport-extension`
2. **テスト・リンター実行**: `pnpm run test` および `pnpm run lint`
3. **デプロイ**:
   - `pnpm run deploy:chrome`
   - `pnpm run deploy:firefox` (Waiting for approval...になったら終了)
4. **プッシュ**: `git push`

---

## コマンド: /deploy production

本番リリースのためのバージョンアップとプルリクエスト作成を行います。

### 1. バージョン更新（自動実行）
変更があったコンポーネントのバージョンをインクリメント（パッチ）します。

1. **フロントエンド**: `frontend/package.json` のバージョンを更新。
2. **パッケージ**: `packages/atpassport-client/package.json` のバージョンを更新。
3. **拡張機能**: `packages/atpassport-extension/package.json` および `src/manifest.json` のバージョンを更新。

### 2. コミットとプッシュ
1. `git add .`
2. `git commit -m "bump(vX.X.X)"` (更新後のバージョンを指定)
3. `git push`

### 3. プルリクエスト作成
`preview` ブランチから `main` ブランチへマージするためのプルリクエストを作成します。

---

## エラーハンドリング
- コマンドが失敗した（ビルドエラー、テスト失敗等）場合のみ、即座に停止し、ユーザーに状況を報告してください。
- 正常に動作している限り、途中で入力を待つ必要はありません。