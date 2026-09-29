# Safari版の使い方（未署名パッケージ）

## 更新後に試す順番

1. Safariの設定で、一時追加した@passportを再読み込みします。
   再読み込みがない場合は削除して、下記フォルダをもう一度追加します。
2. 追加されたストレージ・通信監視の権限、およびサイトへのアクセスを許可します。
3. 同じウインドウで `https://atpassport.net` を開き、ログインします。
4. 拡張を開いてアカウント一覧が出ることを確認します。
5. AtPassportのタブを閉じ、別サイトで拡張を開きます。保存した一覧を使えます。

フォルダ：

```text
/Users/usounds/Program/AtPassport/packages/atpassport-extension/.output/safari-mv3
```

## 保存の範囲

- Safari版では `browser.cookies.get` を利用して `__Host-atpassport_session_v2`（セッションJWT）を取得し、`/api/user/handles` へ `Authorization: Bearer <token>` を付加して直接取得します。
- これにより、AtPassportのタブを開いていなくても、Cookieが存在すればバックグラウンドから直接アカウント一覧を取得できます。
- Cookie APIが利用できない場合やプライベートモード等は、同一ウインドウのAtPassportタブ・セッションキャッシュへのフォールバックを併用します。
- 未ログイン等でアカウントが0件の場合、同一タブの意図しないリダイレクトを防ぐため、別タブでAtPassportを一度開き（既存タブがあれば重複オープンしません）、呼び出し元タブを維持します。
- AtPassportタブがある場合は最新一覧を取得します。通信エラー時に古い一覧で代用しません。

## 更新・ログアウト時

AtPassportの変更通信（POSTなど。Next.js Server Actionsを含む）を検知した時点で
保存内容を消去し、通信完了後に最新一覧を取得します。複数ウインドウが同じログイン状態を
共有する可能性があるため、この消去は全ウインドウに適用します。

AtPassportを開いた時や、そのタブへ戻った時にも取得します。401や不正なデータ、
通信エラーを受けた場合は保存内容を消去します。

Safariの設定からCookieを直接消した場合、別端末でアカウントを削除した場合、
拡張にサイトアクセス権限がない場合などは、即時の更新を保証できません。
タブを閉じている間は最大1時間前の一覧になる可能性があります。
最新の一覧が必要な場合は、AtPassportを再度開いて更新してください。

## 開発者向け

Safari 17.1以降の `storage.session` と `TRUSTED_CONTEXTS` を使用します。
MAIN worldコンテンツスクリプトに対応する新しいSafariで試してください。
保存の読み書きはバックグラウンドに集約し、取得と消去の競合を防いでいます。
通信監視は `https://atpassport.net/*` のみで、リクエスト本文やCookieを読み取りません。
Chrome・Firefoxの取得処理は従来どおりです。

リポジトリのルートで再生成：

```sh
rtk pnpm --filter atpassport-extension run zip:safari
```

出力は `packages/atpassport-extension/.output/atpassport-extension-0.3.2-safari.zip`。
これは未署名のWeb拡張リソースです。署名済みアプリやiPhone用アプリは生成しません。
Xcodeでのパッケージ化・署名・配布は別の作業です。

Safari実機では、通常・プライベート・複数ウインドウ・プロファイル、ログアウト、
アカウント削除、権限取り消し、拡張のバックグラウンド復帰を確認してください。

参考：[Appleの互換性仕様](https://developer.apple.com/documentation/safariservices/assessing-your-safari-web-extension-s-browser-compatibility)、
[WebKitの保存領域へのアクセス制限](https://webkit.org/blog/14735/webkit-features-in-safari-17-1/)。
