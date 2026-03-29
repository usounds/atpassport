# Deployment Skill (Full Automation)

このスキルは、@passportのフロントエンド、パッケージ、およびブラウザ拡張機能のデプロイプロセスを完全に自動化して管理します。

## コマンド: /deploy

ユーザーからデプロイの指示があった場合、以下のフローを**ユーザーの承認（Yes/No）を待つことなく**、エラーが発生しない限り一気通貫で実行してください。

### 1. 変更検知と整合性チェック（自動実行）
まず、プロジェクトルートで以下の確認を行います。

1. **変更箇所の特定**: `git status` および `git diff --name-only HEAD` を実行。
   - `frontend/`、`packages/atpassport-client/`、`packages/atpassport-extension` のいずれに変更があるかを把握する。
2. **コミット状態の確認**: 未コミットの変更がある場合は、更新内容に応じてGitに自動でコミットする。コメントのルールは遵守すること
   - すべてコミットされている場合のみ次へ進む。

### 2. フロントエンドのデプロイフロー（自動実行）
`frontend/` に変更がある場合に実行します。

1. **ディレクトリ移動**: `cd frontend`
2. **準備**: `pnpm lint` と `pnpm test`を実行
    - 失敗した場合は、トラブルシュートを行いエラーが無くなるまで繰り返すこと
3. **ビルド確認**: `pnpm run build`
   - 失敗した場合は中断。
4. **データ更新とプッシュ**:
   - package.jsonのバージョンを更新してください
   - `pnpm run deploy`
5. **コミットとプッシュ**:
   - `git add .`
   - `git commit -m "bump(vX.X.X)"` (X.X.Xは更新後のバージョン)
   - `git push`

### 3. パッケージのデプロイフロー（自動実行）
`packages/atpassport-client/` に変更がある場合に実行します。

1. **ディレクトリ移動**: `cd packages/atpassport-client`
2. **テスト実行**: `pnpm run test`
   - 失敗した場合は中断。
3. **バージョン更新とビルド**:
   - パッケージのバージョンが上がっていなかったら、パッチバージョン（３つ目）をインクリメントしてください
   - `pnpm run build`
4. **npm更新**:
   - `pnpm run deploy`
   - ユーザーの認証を挟むので、そこで一度ユーザーの操作を待つようにしてください
5. **コミットとプッシュ**:
   - `git add .`
   - `git commit -m "bump(vX.X.X)"` (X.X.Xは更新後のバージョン)
   - `git push`


### 4s. ブラウザ拡張機能のデプロイフロー（自動実行）
`packages/atpassport-extension/` に変更がある場合に実行します。

1. **ディレクトリ移動**: `cd packages/atpassport-extension`
2. **テスト実行**: 
   - `pnpm run test`
   - `pnpm run lint`
   - 失敗した場合はトラブルシュートして再実行。
3. **バージョン更新とビルド**:
   - package.jsonとsrc/manifest.jsonsのバージョンが上がっていなかったら、パッチバージョン（３つ目）をインクリメントしてください
4. **デプロイ**:
   - `pnpm run deploy:chrome`
   - `pnpm run deploy:firefox`　Waiting for approval...になったら、終了してください
5. **コミットとプッシュ**:
   - `git add .`
   - `git commit -m "bump(vX.X.X)"` (X.X.Xは更新後のバージョン)
   - `git push`

### 4. デプロイ完了通知
すべての対象ディレクトリの処理が正常に完了した後、以下の情報をユーザーに報告します。
- 更新されたコンポーネント（Frontend / Backend）のリスト。
- すべてのプロセスが正常に終了した旨の通知。

## エラーハンドリング
- コマンドが失敗した（ビルドエラー、テスト失敗、不一致検知等）場合のみ、即座に停止し、ユーザーに状況を報告してください。
- 正常に動作している限り、途中で入力を待つ必要はありません。