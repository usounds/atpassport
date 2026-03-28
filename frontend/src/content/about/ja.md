---
title: "@passport について"
last_updated: "2026年3月23日"
---

@passportは、atprotoエコシステムのためのハンドル管理・認証アシスタントです。

atprotoは分散型であるがゆえに、「Blueskyでログイン」のようなワンボタン認証が利用できず、各サービスでの認証時に都度ハンドルを入力する必要があります。Blueskyのハンドルの文字列は長く、残念ながら入力ミスを誘発しやすいです。また、一般的なパスワードマネージャーではURL毎に候補を保持するため、複数のアプリケーションを利用する事が多いatprotoにおいては、サービスのURLをパスワードマネージャーに一つずつ追加する手間が発生していました。

この課題を解決するために、一度ハンドルを登録すれば、複数のatprotoサービスで都度ハンドルの入力が不要になる仕組みとして@passportを立ち上げました。

あくまでも「ハンドル(例: @alice.bsky.social)」のみが本サーバーに保存され、パスワードを始めとした認証情報は一切本サーバーには保存されませんので、安心してご利用いただけます。

## 2つの連携・利用方法

本サービスは、開発者による「@passport連携」と、利用者による「ブラウザ拡張機能の導入」の2つの手段で利用が可能です。

複数のデバイスやブラウザでハンドルの一覧を共有したい場合に対応出来るように共有機能も準備しました。ブラウザの機能拡張も、利用しているブラウザと自動で同期されます。

| | @passport連携 | ブラウザ拡張機能 |
| :--- | :--- | :--- |
| 概要 | 開発者がサイトに機能を組み込む | 利用者がブラウザにインストールする |
| 対象サイト | 対応済みのサイトのみ | すべてのサイト (未対応サイトでも動作) |
| メリット | シームレスなログイン体験 | ハンドルを1タップ入力 |
| 主な方法 | サイト側の開発 | [Chrome ウェブストア](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) / [Firefox アドオン](https://addons.mozilla.org/ja/firefox/addon/atpassport/) |

1. @passport連携

   「@passportでログイン」のボタンが実現できます。あくまでも本サイトは、ハンドルを各サイトに戻す機能しか提供しませんが、各サイトの実装によってはシームレスな体験でOAuth認証フローを実現できます。

1. ブラウザ機能拡張

   @passport未対応のサイトでも利用できるように、[Chrome 版](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) および [Firefox 版](https://addons.mozilla.org/ja/firefox/addon/atpassport/)の拡張機能が公開中です。この機能拡張は、パスワードマネージャーアプリのようにハンドルの入力だけをアシストします

---

## 開発者の方へ
@passportは、下記の2つのハンドル入力方法を提供します。

### 1.　@passport連携
エンドユーザーが @passport 経由で認証フローを進める際、そのドメインが @passport に登録されていない場合は、ドメインの所有権が確認されていない旨の警告が表示されます。安心して利用していただくために、[開発者ポータル](/developers/verify) からドメインの登録を行うことをお勧めします。

@passport連携は下記のメカニズムで動作します。

1.各アプリは、@passportで認証ボタンをタップすると、callbackパラメータを指定し@passportに遷移する
2.@passportは、該当セッションに該当するハンドルを一覧表示し、ユーザーがハンドルをタップするとタップしたハンドルを1で指定したcallbackに付与してリダイレクトする
3.各アプリは戻ったハンドルを利用してOAuth認証フローを開始する

連携開始の場所によってscopeが異なる場合などもカスタムパラメータでscopeを定義することで、実現することが可能です。

手順の3においてリダイレクションを直接を行う場合は、よりシームレスなログイン体験を提供することが出来るでしょう。

### 1-1. ライブラリを使う場合
TypeScriptで書かれた公式のクライアントライブラリを提供しています。

```bash
npm install @atpassport/client
```

Reactコンポーネントや連携用のヘルパークラスが含まれており、アプリケーションに直接組み込むことができます。詳細は [@atpassport/client (npm)](https://www.npmjs.com/package/@atpassport/client) および [GitHub リポジトリ](https://github.com/usounds/atpassport) をご確認ください。

### 1-2. ライブラリを使わない場合
ライブラリを使用せず、HTTPリダイレクトを通じて直接ハンドル情報を連携させることが可能です。

1. **認証画面へのリダイレクト**
   以下のURLに、必要なパラメータを付与してユーザーをリダイレクトさせます。
   - `https://atpassport.net/authentication`
   - **パラメータ**:
     - `callback`: 認証完了後の戻り先URL
     - `atpstate` (任意): CSRF対策用のランダムな文字列。指定した場合、コールバック時にそのまま返されます。セキュリティのため指定を推奨します。

   **リダイレクト例:**
   ```url
   https://atpassport.net/authentication?callback=https%3A%2F%2Fyour-app.com%2Fcallback&atpstate=xyz123
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

### 2. 拡張機能による入力アシスト
Webアプリケーションのログインフォームなどで、ハンドルの入力フィールド（`<input>`）の `name` 属性を `handle` に設定してください。
これにより、@passport拡張機能がそのフィールドを自動的に認識し、利用者が拡張機能からハンドルを選択した際に、その値を入力欄に自動反映できるようになります。