---
title: "@passport について"
last_updated: "2026年3月21日"
---

@passportは、atprotoエコシステムのためのハンドル管理・認証アシスタントです。

## 2つの連携・利用方法

@passportは、開発者による「サイト側の最適化」と、利用者による「ブラウザ拡張機能の導入」の2つの側面から構成されています。

| | @passport連携 | ブラウザ拡張機能 |
| :--- | :--- | :--- |
| 概要 | 開発者がサイトに機能を組み込む | 利用者がブラウザにインストールする |
| 対象サイト | 対応済みのサイトのみ | すべてのサイト (未対応サイトでも動作) |
| メリット | シームレスなログイン体験 | どこでもハンドルを1タップ入力 |
| 主な方法 | サイト側の開発 | [Chrome ウェブストアで公開中](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) |


## 利用者の方へ
自分のハンドルを都度入力する手間を省き、対応するサービスでスムーズにログインできるようになります。

登録したハンドル情報はサーバーに保存されます。パスワード等の機密情報は本サーバーには一切保存されません。セッションを管理するためのキーは、ブラウザのクッキーに安全に保存されます。

### ブラウザ拡張機能
@passport未対応のサイトでも利用できるように、Chrome 版の拡張機能が[Chrome ウェブストアで公開中](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn)です。

拡張機能によって、@passport未対応のサイトにおいても、ハンドル入力欄への自動反映が可能になります。これにより、あらゆるサイトでのログインの手間を大幅に削減できます。

---

## 開発者の方へ
@passportは、atprotoを用いたアプリケーションのユーザー体験を向上させるためのツールです。
開発者の皆様は、以下の方法で@passportとの連携が可能です。

### 1. 拡張機能による入力アシスト
Webアプリケーションのログインフォームなどで、ハンドルの入力フィールド（`<input>`）の `name` 属性を `handle` に設定してください。
これにより、@passportの拡張機能がそのフィールドを自動的に認識し、利用者が拡張機能からハンドルを選択した際に、その値を入力欄に自動反映できるようになります。

### 2-1. ライブラリを使う場合
より高度でシームレスな体験（「@passportでログイン」ボタンの設置など）を提供するために、公式のクライアントライブラリを提供しています。

```bash
npm install @atpassport/client
```

Reactコンポーネントや連携用のヘルパークラスが含まれており、アプリケーションに直接組み込むことができます。詳細は [@atpassport/client (npm)](https://www.npmjs.com/package/@atpassport/client) および [GitHub リポジトリ](https://github.com/usounds/atpassport) をご確認ください。

### 2-2. ライブラリを使わない場合
ライブラリを使用せず、HTTPリダイレクトを通じて直接ハンドル情報を連携させることが可能です。

1. **認証画面へのリダイレクト**
   以下のURLに、必要なパラメータを付与してユーザーをリダイレクトさせます。
   - `https://atpassport.net/ja/authentication`
   - **パラメータ**:
     - `callback`: 認証完了後の戻り先URL
     - `atpstate` (任意): CSRF対策用のランダムな文字列。指定した場合、コールバック時にそのまま返されます。セキュリティのため指定を推奨します。

   **リダイレクト例:**
   ```url
   https://atpassport.net/ja/authentication?callback=https%3A%2F%2Fyour-app.com%2Fcallback&atpstate=xyz123
   ```

2. **コールバックの処理**
   認証完了後、指定した `callback` URLに以下のクエリパラメータを伴ってリダイレクトされます。
   - `handle`: 認証されたハンドル
   - `did`: ハンドルのDID
   - `pdsurl`: PDSのURL
   - `atpstate`: 送信時に指定した場合、その文字列が返されます

   **コールバック例:**
   ```url
   https://your-app.com/callback?handle=alice.bsky.social&did=did%3Aplc%3Axxx&pdsurl=https%3A%2F%2Fpds.example.com&atpstate=xyz123
   ```

これらを利用して、ユーザーにハンドルの入力を強いることなく、スムーズなログイン体験を提供することが可能です。

実際の挙動を確認できる[サンプルアプリケーション](/example)を用意しています。カスタムパラメータの受け渡しや、コールバックの挙動をテストできます。
