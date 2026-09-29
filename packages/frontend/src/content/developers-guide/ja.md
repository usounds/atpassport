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

### FedCMによるハンドル入力支援

Chrome / Chromium（141以降）および Firefox（@passport 拡張機能導入環境）では、`requestHandleAssist` を使ってブラウザ標準のアカウント選択UIを表示できます。返されたハンドルは入力候補であり、本人確認の証明として扱ってはいけません。ログインやPDSアクセスを行う場合は、このハンドルからatproto OAuthの完全なフローを開始してください。

```typescript
import { requestHandleAssist } from '@atpassport/client/core';

const result = await requestHandleAssist({
  targetInput: document.querySelector<HTMLInputElement>('[name="handle"]') ?? undefined,
  // 探索モード: 'config' (従来・configURL直接指定), 'types' (登録型IdP), 'auto' (自動)
  discovery: 'auto',
  // 登録型IdPの識別子（省略時は 'https://atpassport.net'）
  type: 'https://atpassport.net',
  // 未対応環境でリダイレクト等の代替手段に進めるためのコールバック
  fallback: async () => {
    window.location.href = atp.generateAuthUrl().url;
    return null;
  },
});

if (result) {
  await startAtprotoOAuth(result.username);
}
```

#### 探索モード（Discovery Mode）
- **`config` (既定・後方互換)**: `configURL` を指定してIdPサーバーから直接候補を取得する従来のFedCM動作です。
- **`types` (登録型IdP / Zero-Network)**: W3C IdP Registration 提案仕様に基づき、ブラウザや拡張機能に事前保存されたIdPアカウントから探索します。未合致のIdPに対する暗黙のネットワーク通信は一切発生しません。
- **`auto` (自動)**: まず `types` による登録型探索を試み、ブラウザが未対応の場合は自動的に `config` 経路へフォールバックします。

#### フォールバック契約とエラー処理
- **キャンセル・同意拒否・候補なし（no-match）**: ユーザーがダイアログを閉じた場合や候補が存在しない場合は、`requestHandleAssist` は安全に `null` を返却します。意図しないリダイレクトや再度のUIポップアップは発生しません。
- **未対応環境（TypeError / NotSupportedError）**: ブラウザがFedCMや指定モードに対応していない場合のみ、指定された `fallback` コールバックが最大1回実行されます。

返される`username`、`did`、`token`はハンドル選択を補助する情報であり、認証情報ではありません。これらを使ってセッションを確立したり、APIリクエストを認可したりしないでください。`token`はBearerトークンやアクセストークンではありません。atproto OAuthを完了し、その検証済み結果を使用してください。

RPのOriginがclient IDになります。事前に@passportのドメイン確認を完了してください。確認済みドメインの設定では、任意のプライバシーポリシーと利用規約リンクを登録できます。それぞれ、そのドメインまたはサブドメイン上のHTTPS URLを指定します。非対応ブラウザでは、後述するリダイレクト方式を引き続き利用できます。

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
   - `handle`: `username` と同じハンドル名
   - `username`: 認証されたハンドル / ユーザー名
   - `did`: ハンドルのDID
   - `pdsurl`: PDSのURL
   - `atpstate`: 送信時に指定した場合、その文字列が返されます

   **コールバック例:**
   ```url
   https://your-app.com/callback?username=alice.atproto.site&handle=alice.atproto.site&did=did%3Aplc%3Axxx&pdsurl=https%3A%2F%2Fpds.example.com&atpstate=xyz123
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

## よくある質問

### @passportはatprotoアプリに何を追加しますか？

@passportは、ユーザーが登録済みハンドルを選択し、そのハンドル、DID、PDS URLをcallbackに返すことで、アプリ側のOAuthフロー開始を補助します。

### @atpassport/clientライブラリは必須ですか？

必須ではありません。ReactアプリではTypeScriptクライアントライブラリの利用を推奨しますが、@passportの認証エンドポイントへの直接リダイレクトでも同じ流れを実装できます。

### なぜドメイン確認が必要ですか？

ドメイン確認を行うと、@passport認証時の未確認ドメイン警告を避けられ、ユーザーに継続前の信頼シグナルを示せます。
