---
title: "@passportをatprotoアプリに実装する"
last_updated: "2026年5月30日"
---

@passportは、atprotoアプリ向けに「@passport連携」と「ブラウザ拡張機能による入力アシスト」の2つのハンドル入力方法を提供します。

## 1. @passport連携

@passport連携は下記のメカニズムで動作します。

1. 各アプリは、「@passportでログイン」ボタンをタップすると、callbackパラメータを指定し@passportに遷移する
2. @passportは、該当セッションに該当するハンドルを一覧表示し、ユーザーがハンドルをタップするとタップしたハンドルを1で指定したcallbackに付与してリダイレクトする
3. 各アプリは戻ったハンドルを利用してOAuth認証フローを開始する

連携開始の場所によってscopeが異なる場合などもカスタムパラメータでscopeを定義することで、実現することが可能です。

手順の2においてリダイレクションを直接を行う場合は、よりシームレスなログイン体験を提供することが出来るでしょう。

## 1-1. ライブラリを使う場合

TypeScriptで書かれた公式のクライアントライブラリを提供しています。

```bash
npm install @atpassport/client
```

Reactコンポーネントや連携用のヘルパークラスが含まれており、アプリケーションに直接組み込むことができます。詳細は [@atpassport/client (npm)](https://www.npmjs.com/package/@atpassport/client) および [GitHub リポジトリ](https://github.com/usounds/atpassport) をご確認ください。

## 1-2. ライブラリを使わない場合

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
   https://your-app.com/callback?handle=alice.atproto.site&did=did%3Aplc%3Axxx&pdsurl=https%3A%2F%2Fpds.example.com&atpstate=xyz123
   ```

これらを利用して、ユーザーにハンドルの入力を強いることなく、スムーズなログイン体験を提供することが可能です。

> エンドユーザーが @passport 経由で認証フローを進める際、そのドメインが @passport に登録されていない場合は、ドメインの所有権が確認されていない旨の警告が表示されます。安心して利用していただくために、[開発者ポータル](/developers/verify) からドメインの登録を行うことをお勧めします。
> 場合によっては、運営者が登録された情報を却下する場合があります。

実際の挙動を確認できる[サンプルアプリケーション](/example)を用意しています。カスタムパラメータの受け渡しや、コールバックの挙動をテストできます。

## 2. 拡張機能による入力アシスト

Webアプリケーションのログインフォームなどで、ハンドル入力フィールド（`<input>`）に以下の属性を設定することを推奨します。

- **`name="handle"`** (最も推奨): 拡張機能が最も確実にフィールドを特定できます。
- **`id="handle"`**: 何らかの理由で `name="handle"` が動作しない場合の代替手段として利用できます。

これらを設定することで、@passport拡張機能がフィールドを自動的に認識し、利用者が拡張機能からハンドルを選択した際に、React等の高度なフレームワークを使用しているサイトでも確実に値が反映されるようになります。
