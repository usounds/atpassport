# DESIGN: ステップ1 - Webフロントエンド Accounts Push & IdP Registration 対応設計

## 1. 概要と目的

本ステップ（ステップ1）の目的は、AtPassport Webフロントエンド（`packages/frontend`）において、W3C FedCM の最新拡張仕様である **Accounts Push（`navigator.login.setStatus`）** および **IdP Registration / Unregistration（`IdentityProvider.register` / `unregister`）** を実装し、既存のユーザー操作やセキュリティを一切損なうことなく、ブラウザと拡張機能へのアカウント一覧自動同期および登録型連携を実現することです。

---

## 2. アーキテクチャ方針：3つの機能レイヤーの明確な分離

ユーザー体験の混乱（「登録ボタンを押さなければ使えないのか？」という誤解）を防ぎ、既存の安定した利用フローを維持するため、以下の3レイヤーを厳格に分離して実装します。

```
┌────────────────────────────────────────────────────────────────────────┐
│ レイヤー1: 通常のFedCM（既存・安定機能）                               │
│  - 相手サイト（RP）が configURL を指定して呼び出す方式                 │
│  - ユーザー操作不要。トップの「FedCM Ready」バッジをそのまま維持       │
├────────────────────────────────────────────────────────────────────────┤
│ レイヤー2: Accounts Push（裏側での自動同期）                           │
│  - ハンドルの追加・削除・並び替え・再訪時に自動実行                    │
│  - 2段階 setStatus 呼び出し（Accounts Push → ベースラインフォールバック） │
│  - 0件時は setStatus('logged-out') で安全にログアウト通知               │
├────────────────────────────────────────────────────────────────────────┤
│ レイヤー3: IdP Registration / Unregistration（実験的・登録型機能）     │
│  - トップ下部に独立した折りたたみ式（または設定）UIとして配置          │
│  - 「ブラウザに登録」「登録を解除」のペア導線を提供                    │
│  - ※Firefox拡張機能ユーザーはインストール＝連携済みとして手動登録不要 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. データ構造と型定義

### 3.1 FedCM アカウント型 (`FedCmAccount`)

正規エンドポイント（`/api/fedcm/accounts`）と完全一致するアカウント構造を採用します。

```typescript
export interface FedCmAccount {
  id: string; // DID (例: did:plc:...)
  name: string; // 表示名（未設定時は handle）
  username: string; // @付きハンドル（例: @alice.bsky.social）
  picture?: string; // アバター画像URL
  approved_clients: string[]; // 承認済みクライアントID配列（空配列 []）
}
```

### 3.2 既存データ（`AssociationWithProfile`）からの変換

フロントエンドのローカル状態から `FedCmAccount` へのマッピング関数を用意します。

```typescript
export function toFedCmAccount(item: {
  did: string;
  handle: string;
  profile?: { displayName?: string; avatar?: string } | null;
}): FedCmAccount {
  const displayName = item.profile?.displayName?.trim();
  return {
    id: item.did,
    name: displayName || item.handle,
    username: `@${item.handle}`,
    ...(item.profile?.avatar ? { picture: item.profile.avatar } : {}),
    approved_clients: [],
  };
}
```

---

## 4. 実装詳細設計

### 4.1 クライアント同期ロジック (`packages/frontend/src/lib/fedcm-session-client.ts`)

#### ① Accounts Push 実装 (`syncAccountsPush`)
* `navigator.login?.setStatus` のサポート有無を安全に検知。
* **2段階フォールバック保証**:
  1. まず第2引数付きの `setStatus('logged-in', { accounts })`（Accounts Push 提案仕様）を実行。
  2. Accounts Push 未対応で第2引数を拒否するベースライン環境（`TypeError: 1 argument required` 等）の場合は、自動的に第1引数のみの `setStatus('logged-in')` にフォールバック。
* アカウントが0件（全削除時など）の場合は `setStatus('logged-out')` を実行。
* 例外はすべて内部で安全にキャッチ（サイレント処理）し、未対応ブラウザや権限エラーで画面操作が中断されることを100%防止。

```typescript
/**
 * ブラウザの FedCM Accounts Push 機構へ現在のアカウント一覧を同期する
 */
export async function syncAccountsPush(accounts: FedCmAccount[]): Promise<void> {
  if (typeof navigator === 'undefined') return;

  const nav = navigator as Navigator & {
    login?: {
      setStatus: (
        status: 'logged-in' | 'logged-out',
        options?: { accounts: FedCmAccount[] }
      ) => Promise<void>;
    };
  };

  if (!nav.login?.setStatus) return;

  try {
    if (accounts.length > 0) {
      try {
        // 1. Accounts Push (提案仕様) を試行
        await nav.login.setStatus('logged-in', { accounts });
      } catch (pushErr) {
        // 2. 引数不一致で失敗した場合は、ベースラインの Login Status API (1引数) にフォールバック
        await nav.login.setStatus('logged-in');
      }
    } else {
      await nav.login.setStatus('logged-out');
    }
  } catch (error) {
    // 未対応・ユーザー設定により拒否された場合でもエラーを伝播させない
    console.debug('[FedCM Push] setStatus failed (safely ignored):', error);
  }
}
```

#### ② IdP Registration / Unregistration (`registerIdp` / `unregisterIdp`)
* ローカル開発環境（`localhost:3000`）やプレビュー環境をサポートするため、動的に `config.json` の URL を解決。
* W3C IdP Registration 提案仕様に基づく `IdentityProvider.register()` および `IdentityProvider.unregister()` を呼び出し。

```typescript
export function getFedCmConfigUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return `${window.location.origin}/fedcm/config.json`;
  }
  return 'https://atpassport.net/fedcm/config.json';
}

export async function registerIdp(configURL: string = getFedCmConfigUrl()): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'no_window' };

  const idp = (window as unknown as { IdentityProvider?: { register: (url: string) => Promise<void> } }).IdentityProvider;
  if (!idp?.register) {
    return { success: false, error: 'not_supported' };
  }

  try {
    await idp.register(configURL);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function unregisterIdp(configURL: string = getFedCmConfigUrl()): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'no_window' };

  const idp = (window as unknown as { IdentityProvider?: { unregister: (url: string) => Promise<void> } }).IdentityProvider;
  if (!idp?.unregister) {
    return { success: false, error: 'not_supported' };
  }

  try {
    await idp.unregister(configURL);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function hasIdpRegistrationSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as unknown as { IdentityProvider?: { register?: unknown } }).IdentityProvider?.register === 'function';
}
```

---

### 4.2 アカウント変更イベントとの連動

`AssociationListClient` と `AuthAccountList` は `useAccountList` を共用する。

- サーバーから受け取った初期一覧を全件Pushする。プロフィール取得結果はeffectの取消しと世代番号で検証し、削除・並べ替え・新しいprops・アンマウント後に古い一覧を再Pushしない。
- 楽観的更新は画面表示だけに使う。同一コンポーネント内の変更は直列化する。
- `removeAssociation` / `moveAssociation` は `{ success: true, associations }` または `{ success: false, error }` を返す。セッションなし・対象なしを成功扱いにしない。
- 更新後はDynamoDBの整合性の強い読出しで確定一覧を取得し、その返却一覧だけをPushする。失敗時は画面を戻し、楽観的な一覧をPushしない。
- `RegisterForm` も `registerHandle` が返す確定一覧をPushする。端末同期・再訪による新propsも同じ共通経路へ渡す。
- プロフィールだけの再取得は画面表示に反映し、サーバーから再取得された一覧をPushの正本とする。

回帰テストは遅延プロフィール応答、更新中の追加操作、セッション失効、サーバー一覧と画面の予測一覧が異なるケースを含む。

---

### 4.3 実験的 IdP Registration 操作 UI (`IdpRegistrationControl.tsx`)

通常のユーザー操作の視覚的ノイズを極小化するため、トップページ下部の `ShareSection` 付近に、控えめな折りたたみ（Collapse/Accordion）または設定UIとして配置します。

* **UIコンポーネント設計**:
  - 実験的機能（Experimental）を示す小さなバッジと説明文。
  - 「ブラウザに登録（Register）」ボタン：未登録時に強調。
  - 「登録を解除（Unregister）」ボタン：登録済み時に利用可能。
  - ブラウザが `IdentityProvider` API 未対応の場合の非活性・ツールチップ表示（「お使いのブラウザは事前登録型FedCMに未対応です」）。
  - 操作完了時のトースト通知（Mantine `notifications`）。

---

## 5. テスト・検証計画

### 5.1 単体テスト（Vitest）
* `toFedCmAccount`: 表示名フォールバック（未設定時に handle）、アバター有無のテスト。
* `syncAccountsPush`:
  - Accounts Push（2引数）対応環境で `{ accounts }` が渡されること。
  - 2引数が拒否された場合に1引数 `logged-in` へ正しくフォールバックすること。
  - 0件時に `logged-out` が渡されること。
  - `navigator.login` が未定義の環境で例外なく即時復帰すること。
* `registerIdp` / `unregisterIdp`:
  - `IdentityProvider` の呼び出しおよび戻り値の成否判定。
  - 未対応ブラウザで `{ success: false, error: 'not_supported' }` が返ること。

### 5.2 結合・回帰検証
* Chrome Canary / 最新版 Chrome での動作確認。
* Safari / 通常の Firefox（拡張なし）で既存のハンドル追加・削除が一切阻害されないこと。
* `pnpm --filter frontend compile` および `pnpm --filter frontend build` による Next.js 本番ビルド検証。

---

## 6. 完了判定基準（Exit Criteria）

- [ ] ハンドル追加・削除・並べ替え・再訪時に `syncAccountsPush` が呼び出されること。
- [ ] Accounts Push非対応環境でも、ベースラインの `logged-in` 状態通知が維持されること（2段階フォールバック）。
- [ ] アカウント全削除時にブラウザへ `logged-out` が正しく伝達されること。
- [ ] IdP Registration / Unregistration の対となる操作導線が設置されていること。
- [ ] 未対応ブラウザ環境において既存の操作・表示に一切の影響を与えないこと（非破壊性の保証）。
- [ ] フロントエンドの単体テストおよび本番ビルドがすべてパスすること。
