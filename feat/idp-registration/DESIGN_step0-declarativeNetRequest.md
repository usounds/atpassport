# DESIGN: ステップ0 - declarativeNetRequest による FedCM ヘッダー注入先行検証

## 1. 概要と目的

本ステップ（ステップ0）の目的は、Firefox拡張機能（`packages/atpassport-extension`）において、特権APIである **`declarativeNetRequest` (DNR)** を用いてネットワーク層で `Sec-Fetch-Dest: webidentity` をリクエストヘッダーに注入し、AtPassportの正規FedCMエンドポイント（`/api/fedcm/*`）と直接通信可能であることを先行実証することです。

Webサービス本体（ステップ1）の大規模な改修に入る前に、この最大の技術的仮説を実機で100%検証（De-risking）します。

---

## 2. 背景と技術的課題

1. **WHATWG Fetch仕様の制約（禁止ヘッダー）**:
   - `Sec-` で始まるヘッダー（`Sec-Fetch-Dest` 等）は「Forbidden Header Name」に指定されており、通常のJavaScript `fetch(url, { headers: { 'Sec-Fetch-Dest': 'webidentity' } })` ではブラウザによって自動的に破棄・上書きされます。
2. **AtPassportサーバーの防御壁**:
   - 既存の正規エンドポイント（`/api/fedcm/accounts`, `/api/fedcm/assertion`）は、CSRF防御のため `isFedCmRequest()`（`Sec-Fetch-Dest === "webidentity"`）を厳格に要求しており、ヘッダーがないリクエストは **400 Bad Request** で即時遮断されます。
3. **拡張機能の特権による解決**:
   - WebExtensionの `declarativeNetRequest`（DNR）の `modifyHeaders` ルールを使用することで、JavaScriptエンジンを通った後のネットワーク層でヘッダーを安全に注入できます。

---

## 3. 実装詳細設計

### 3.1 権限追加（Firefox限定スコープ） (`packages/atpassport-extension/wxt.config.ts`)

ChromeはネイティブFedCMをサポートしているため、拡張機能側でのヘッダー注入は不要です。Chromeビルドに不要な権限警告を出さないよう、`declarativeNetRequest` は **Firefoxの場合のみ** 条件付きで追加します。

```typescript
// packages/atpassport-extension/wxt.config.ts
manifest: (env) => ({
  // ...
  permissions: [
    'activeTab',
    'scripting',
    'clipboardWrite',
    // 【Firefox限定】ネットワーク層でのヘッダー操作権限（ChromeはネイティブFedCMを使用するため不要）
    ...(env.browser === 'firefox' ? ['declarativeNetRequest'] : []),
  ],
  host_permissions: [
    'https://atpassport.net/*',
    ...(env.browser === 'firefox' ? ['<all_urls>'] : []),
  ],
  // ...
})
```

> **注意**: `modifyHeaders` によるリクエストヘッダー操作を行うには、対象オリジンの `host_permissions` が必要です。Firefoxでは既存の `<all_urls>` または `https://atpassport.net/*` により十分な権限が確保されています。

---

### 3.2 ルール定義（正規表現による厳格なURL検証と動的登録）

`urlFilter` ではなく **`regexFilter`（RE2構文）** を使用することで、プロトコル、ドメイン、およびパス（`/api/fedcm/*`）を厳格に検証し、無関係な通信へのヘッダー誤注入や悪意あるドメインへの漏洩を完全に防ぎます。

また、拡張機能の再読み込みや更新時の `Duplicate rule ID` エラーを防ぐため、**`removeRuleIds` による既存ルールのクリーンアップと追加をアトミックに実行** します。

```typescript
// packages/atpassport-extension/src/entrypoints/background.ts
const FEDCM_HEADER_RULE_ID = 1001;

/**
 * Firefoxポリフィル用: /api/fedcm/* 宛てリクエストに Sec-Fetch-Dest: webidentity を注入する
 */
export async function setupFedCmHeaderRule() {
  if (import.meta.env.BROWSER !== 'firefox') {
    return;
  }

  // 本番およびプレビュー環境のAtPassportドメイン配下の /api/fedcm/* に完全一致
  // ※ローカル開発環境も含める場合は '(?:(?:[a-zA-Z0-9-]+\\.)*atpassport\\.net|localhost:[0-9]+)' 等に対応可能
  const fedcmUrlRegex = '^https://(?:[a-zA-Z0-9-]+\\.)*atpassport\\.net/api/fedcm/.*';

  const fedcmHeaderRule: chrome.declarativeNetRequest.Rule = {
    id: FEDCM_HEADER_RULE_ID,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          header: 'Sec-Fetch-Dest',
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: 'webidentity',
        },
      ],
    },
    condition: {
      regexFilter: fedcmUrlRegex,
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
      ],
    },
  };

  try {
    // 既存のルールIDを削除してから追加することで冪等性を担保（重複登録エラーを防止）
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [FEDCM_HEADER_RULE_ID],
      addRules: [fedcmHeaderRule],
    });
    console.log('[AtPassport] FedCM declarativeNetRequest rule registered successfully.');
  } catch (error) {
    console.error('[AtPassport] Failed to register FedCM declarativeNetRequest rule:', error);
  }
}
```

* **`regexFilter` のポイント**:
  - `^https://` でHTTPS通信を強制。
  - `(?:[a-zA-Z0-9-]+\\.)*atpassport\\.net` で `atpassport.net` およびそのサブドメイン（`preview.atpassport.net` 等）のみに厳格限定。
  - `/api/fedcm/.*` でFedCM用エンドポイント配下のみを対象化。
  - `urlFilter` と `regexFilter` は排他的（併用不可）であるため、`regexFilter` のみを指定。

---

### 3.3 代替フォールバック（Firefox固有の保険案）

万が一、FirefoxのGeckoエンジンにおける `declarativeNetRequest` で `Sec-` ヘッダーの書き換えに既知の不具合や制約が存在した場合、Firefox MV3で引き続きサポートされている **`webRequest.onBeforeSendHeaders`（`blocking` 権限）** に切り替えます。

```typescript
// フォールバック実装案（DNRに問題が生じた場合のみ使用）
browser.webRequest?.onBeforeSendHeaders?.addListener(
  (details) => {
    const headers = details.requestHeaders ?? [];
    const secHeader = headers.find(h => h.name.toLowerCase() === 'sec-fetch-dest');
    if (secHeader) {
      secHeader.value = 'webidentity';
    } else {
      headers.push({ name: 'Sec-Fetch-Dest', value: 'webidentity' });
    }
    return { requestHeaders: headers };
  },
  { urls: ['https://*.atpassport.net/api/fedcm/*'] },
  ['blocking', 'requestHeaders']
);
```

---

## 4. 検証手順（テストプラン）

### 4.1 自動テスト（単体テスト）
* ルール定義および `regexFilter` の正規表現が対象URL（本番・プレビュー）にマッチし、無関係なURL（`https://example.com/api/fedcm/` や `https://atpassport.net/api/user/`）にはマッチしないことをユニットテストで検証。

### 4.2 実機通信検証（Integration Verification）
1. 拡張機能をFirefoxで起動（`pnpm --filter atpassport-extension dev:firefox`）。
2. バックグラウンドページのコンソールを開き、テストリクエストを実行：
   ```javascript
   fetch('https://atpassport.net/api/fedcm/accounts')
     .then(res => console.log('Response Status:', res.status));
   ```
3. **判定結果の確認**:
   * ❌ **失敗（DNR未動作）**: `400 Bad Request`（`isFedCmRequest` で弾かれる）
   * ⭕ **成功（DNR動作）**: `401 Unauthorized`（ヘッダー検証を通過し、未ログイン時のCookie判定まで到達した証拠）
4. 開発者ツールの Network タブで、該当リクエストの Request Headers に `Sec-Fetch-Dest: webidentity` が付与されていることを確認。

---

## 5. 完了判定基準（Exit Criteria）

- [ ] `atpassport-extension` のビルドが型エラーなく正常に通過すること。
- [ ] Firefoxビルドにのみ `declarativeNetRequest` が含まれ、Chromeビルドには不要な権限が含まれないこと。
- [ ] 拡張機能からの `/api/fedcm/*` 宛てリクエストに `Sec-Fetch-Dest: webidentity` が確実に注入されること。
- [ ] サーバー側で `400 Bad Request` にならず、正規のFedCMリクエストとして認識されることが実機確認できること。
- [ ] これにより、ステップ1およびステップ2で「正規エンドポイント `/api/fedcm/assertion` への完全一本化」を採用できる確証が得られること。
