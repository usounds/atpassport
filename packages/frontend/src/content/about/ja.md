---
title: "@passport について"
last_updated: "2026年4月26日"
---

@passportは、[atproto](https://atproto.com)エコシステムのためのハンドル管理・認証アシスタントです。

atprotoは分散型であるがゆえに、「Blueskyでログイン」のようなワンボタン認証が利用できず、各サービスでの認証時に都度ハンドルを入力する必要があります。Blueskyのハンドルの文字列は長く、残念ながら入力ミスを誘発しやすいです。また、一般的なパスワードマネージャーではURL毎に候補を保持するため、複数のアプリケーションを利用する事が多いatprotoにおいては、サービスのURLをパスワードマネージャーに一つずつ追加する手間が発生していました。

この課題を解決するために、一度ハンドルを登録すれば、複数のatprotoサービスで都度ハンドルの入力が不要になる仕組みとして@passportを立ち上げました。

```bluesky-embed
<blockquote class="bluesky-embed" data-bluesky-uri="at://did:plc:7qu7hsthk2mtm5ilru4umrsf/app.bsky.feed.post/3mjwiio2yns2s" data-bluesky-cid="bafyreidnvrfgytgt52wqbxldkh5uhribi7acfbc2tkqxmwghhndnrxb5uu" data-bluesky-embed-color-mode="system"><p lang="en">対応サイトではこのように動作します。
※初めてログインするアプリでは、権限の確認が入ります

ネイティブに対応しているアプリは現在下記の3つとなります

chavatar.app
skyblur.uk
rito.blue<br><br><a href="https://bsky.app/profile/did:plc:7qu7hsthk2mtm5ilru4umrsf/post/3mjwiio2yns2s?ref_src=embed">[image or embed]</a></p>&mdash; @passport (<a href="https://bsky.app/profile/did:plc:7qu7hsthk2mtm5ilru4umrsf?ref_src=embed">@atpassport.net</a>) <a href="https://bsky.app/profile/did:plc:7qu7hsthk2mtm5ilru4umrsf/post/3mjwiio2yns2s?ref_src=embed">2026年4月20日 21:41</a></blockquote><script async src="https://embed.bsky.app/static/embed.js" charset="utf-8"></script>
```

あくまでも「ハンドル(例: @alice.bsky.social)」のみが本サーバーに保存され、パスワードを始めとしたJWTトークンなどの認証情報は一切本サーバーには保存されませんので、安心してご利用いただけます。

# 2つの連携・利用方法

本サービスは、開発者による「@passport連携」と、利用者による「ブラウザ拡張機能の導入」の2つの手段で利用が可能です。

複数のデバイスやブラウザでハンドルの一覧を共有したい場合に対応出来るように共有機能も準備しました。ブラウザの機能拡張も、利用しているブラウザと自動で同期されます。

| | @passport連携 | ブラウザ拡張機能 |
| :--- | :--- | :--- |
| 概要 | 開発者がサイトに機能を組み込む | 利用者がブラウザにインストールする |
| 対象サイト | 対応済みのサイトのみ | @passport連携の未対応サイトでも動作 |
| メリット | シームレスなログイン体験 | ハンドルを1タップ入力 |
| 主な方法 | サイト側の開発 | [Chrome ウェブストア](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) / [Firefox アドオン](https://addons.mozilla.org/ja/firefox/addon/atpassport/) |

1. @passport連携

   「@passportでログイン」のボタンが実現できます。あくまでも本サイトは、ハンドルを各サイトに戻す機能しか提供しませんが、各サイトの実装によってはシームレスな体験でOAuth認証フローを実現できます。

1. ブラウザ機能拡張

   @passport未対応のサイトでも利用できるように、[Chrome 版](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) および [Firefox 版](https://addons.mozilla.org/ja/firefox/addon/atpassport/)の拡張機能が公開中です。この機能拡張は、パスワードマネージャーアプリのようにハンドルの入力だけをアシストします

# 使い方

いずれのパターンにおいても、まずは本サイト上でハンドルの登録が必要です

## ハンドルの登録
1. [トップページ](https://atpassport.net)に移動します
1. 「+ ハンドルを登録」ボタンをタップします
1. あなたのハンドルを入力します
1. 利用規約とプライバシーポリシーを確認し、チェックボックスをオンにします
1. 「追加する」ボタンをタップします

複数のハンドルをお持ちの方は、上記の手順を繰り返してください。一度登録が完了すると、ブラウザ機能拡張や連携アプリでハンドルの入力が不要になります。

尚、ハンドルの最大登録件数は15件となり、それ以上のハンドルを登録することは出来ません。

## 複数デバイスの対応
@passportは、複数のデバイスやブラウザでハンドルの一覧を共有する機能を提供します。これを「デバイス間の共有」と呼びます。一度この同期の手順を行うと、どこかのブラウザでハンドルが追加されると、別のブラウザでも追加した内容が反映されます。

尚、この操作を行うと共有先のブラウザに保存されている内容は上書きされますのでご注意ください。

1. 共有元のブラウザで[トップページ](https://atpassport.net)に移動します
1. 「デバイス間の共有」ボタンをタップします
1. URLをコピーし、共有先ブラウザでそのURLにアクセスします
1. 共有先ブラウザで「元のデバイスの内容と同期する」ボタンをタップします

## ブラウザ機能拡張の導入

ブラウザ機能拡張は、現在ChromeとFirefoxで利用可能です。

1. [Chrome ウェブストア](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) または [Firefox アドオン](https://addons.mozilla.org/ja/firefox/addon/atpassport/)にアクセスします
1. 「Chromeに追加」または「Firefoxに追加」ボタンをクリックします
1. ブラウザの指示に従ってインストールを完了します

各アプリにおいては、下記のように利用します

1. ハンドルを入力する画面において、@passportの機能拡張をタップします
1. 入力するハンドルをタップします
1. Webアプリによっては、直接ハンドルが入力できます。@passport機能拡張がハンドル入力欄を認識できない場合は、クリップボードにコピーされますので、ご自身で貼り付け(ペースト)をお願いします

## メタデータ更新

ハンドルを変更したり、PDSを移動した場合は「メタデータの更新」が必要となります。

1. [トップページ](https://atpassport.net)に移動します
1. 更新したいハンドルの横にある3点リーダーをタップします
1. 「メタデータを更新」をタップします

---

# 開発者の方へ
@passportは、下記の2つのハンドル入力方法を提供します。

### 1.　@passport連携
@passport連携は下記のメカニズムで動作します。

1. 各アプリは、「@passportでログイン」ボタンをタップすると、callbackパラメータを指定し@passportに遷移する
2. @passportは、該当セッションに該当するハンドルを一覧表示し、ユーザーがハンドルをタップするとタップしたハンドルを1で指定したcallbackに付与してリダイレクトする
3. 各アプリは戻ったハンドルを利用してOAuth認証フローを開始する

連携開始の場所によってscopeが異なる場合などもカスタムパラメータでscopeを定義することで、実現することが可能です。

手順の2においてリダイレクションを直接を行う場合は、よりシームレスなログイン体験を提供することが出来るでしょう。

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

> エンドユーザーが @passport 経由で認証フローを進める際、そのドメインが @passport に登録されていない場合は、ドメインの所有権が確認されていない旨の警告が表示されます。安心して利用していただくために、[開発者ポータル](/developers/verify) からドメインの登録を行うことをお勧めします。
> 場合によっては、運営者が登録された情報を却下する場合があります。

実際の挙動を確認できる[サンプルアプリケーション](/example)を用意しています。カスタムパラメータの受け渡しや、コールバックの挙動をテストできます。

### 2. 拡張機能による入力アシスト
Webアプリケーションのログインフォームなどで、ハンドル入力フィールド（`<input>`）に以下の属性を設定することを推奨します。

- **`name="handle"`** (最も推奨): 拡張機能が最も確実にフィールドを特定できます。
- **`id="handle"`**: 何らかの理由で `name="handle"` が動作しない場合の代替手段として利用できます。

これらを設定することで、@passport拡張機能がフィールドを自動的に認識し、利用者が拡張機能からハンドルを選択した際に、React等の高度なフレームワークを使用しているサイトでも確実に値が反映されるようになります。

# よくある質問 (FAQ)

### Q: 利用料金はかかりますか？
A: いいえ、@passportは完全に無料で利用できます。

### Q: セキュリティは大丈夫ですか？
A: はい。@passportはあなたのハンドル（例: @alice.bsky.social）のみを保存し、パスワードや秘密鍵、JWTトークンなどの機密情報は一切保存しません。

### Q: 登録したデータを削除するにはどうすればいいですか？
A: トップページのハンドル一覧から、削除したいハンドルの横にあるメニュー（3点リーダー）をタップし、「削除」を選択してください。ブラウザのローカルストレージに保存されているデータが削除されます。

### Q: atproto以外のSNSでも使えますか？
A: 現在のところ、Blueskyを含むatprotoエコシステムのみをサポートしています。