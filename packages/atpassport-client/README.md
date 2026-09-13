# @atpassport/client

[@passport](https://atpassport.net) is a service designed to eliminate the need for handle entry across applications in the atproto ecosystem.
Using this client library, you can integrate a @passport-powered "handle input assist feature" into your web applications.

*For the Japanese documentation, please see [README_ja.md](./README_ja.md).*

## Features
- **Single package-root API**
- **OAuth-like secure integration flow** (Built-in CSRF protection via `atpstate`)
- **Custom parameter passthrough** (Query parameters attached to the callback URL are automatically returned)

## Installation

```bash
npm install @atpassport/client
# or
pnpm add @atpassport/client
```

## Usage

```typescript
import { AtPassport } from '@atpassport/client';

// 1. Initialize the client
const passport = new AtPassport({
  callbackUrl: 'https://myapp.com/api/atpassport/callback', // Required: The URL to redirect back to
  lang: 'en', // Optional: 'en', 'ja', 'pt', 'de', 'fr', 'es'
  requiredParams: { returnTo: 'string' } // Optional: Define required parameters
});

// 2. Generate the authentication URL and atpstate (for CSRF protection)
// In TypeScript, 'returnTo' (defined in requiredParams) is required
const { url, atpstate } = passport.generateAuthUrl({
  returnTo: window.location.href
});

// 3. Save atpstate to cookies or session to prevent CSRF
document.cookie = `atpstate=${atpstate}; path=/; max-age=600; SameSite=Lax`;

// 4. Redirect the user to @passport
window.location.href = url;
```

```typescript
// Receive the parameters on your callback page (Next.js API Route example at https://myapp.com/api/atpassport/callback)

export async function GET(req: Request) {
  const url = new URL(req.url);
  const expectedState = getCookie(req, 'atpstate'); // Get saved state from cookie
  
  try {
    const result = passport.parseCallback(req.url, expectedState);
    
    console.log('Handle:', result.handle);
    console.log('Custom Parameters:', result.customParams.returnTo);
    
    // Continue the OAuth flow... (e.g., call authorize() with the received handle using your OAuth library)
    const authUrl = await client.authorize(result.handle);

  } catch (err) {
    console.error('Finalize login failed:', err);
  }
}
```

## Standard UI Texts and Icons for Integration

To make it easy for developers to build consistent "Login with @passport" buttons, the client library exports multi-language standard texts and an SVG icon constant `AtPassportUI`.

```typescript
import { AtPassportIcon, AtPassportUI } from '@atpassport/client';

// English translations
console.log(AtPassportUI.en.title); // "Login with @passport"
console.log(AtPassportUI.en.description); // "@passport is a handle manager that eliminates the need for handle entry across atproto apps."

// Japanese translations
console.log(AtPassportUI.ja.title); // "@passportでログイン"
console.log(AtPassportUI.ja.description); // "@passportは、各atprotoアプリでハンドルを都度入力する手間が省ける共通ハンドルマネージャーです。"

// Standard Icon (SVG String)
const svgString = AtPassportUI.iconSvg;

// Use it in your React component
// <AtPassportIcon size={24} />
```

## FedCM (Native Browser Account Chooser) Handle Input Assist

On Chrome and Chromium 141+, you can use the W3C standard **FedCM (Federated Credential Management API)** to display a native, seamless browser account chooser.
Users can select their registered @passport handle with a single tap, without installing extensions or opening modal redirects.

### 1. Basic Usage

By providing a `fallback` to `requestHandleAssist()`, supported browsers (Chrome, Edge) use the native FedCM sheet, while unsupported browsers (Safari, Firefox) automatically trigger the web redirect flow.

```typescript
import { AtPassport } from '@atpassport/client';

const passport = new AtPassport({
  callbackUrl: 'https://myapp.com/api/atpassport/callback',
  fedcm: true,
});

button.addEventListener('click', async () => {
  const input = document.querySelector<HTMLInputElement>('input[name="handle"]');

  const result = await passport.requestHandleAssist({
    targetInput: input ?? undefined,
    fallback: async () => {
      // Fallback for browsers without FedCM
      const { url, atpstate } = passport.generateAuthUrl();
      document.cookie = `atpstate=${atpstate}; path=/; max-age=600; SameSite=Lax`;
      window.location.href = url;
      return null;
    },
  });

  if (result) {
    await startAtprotoOAuth(result.username);
  }
});
```

> [!TIP]
> **When to use `passport.isHandleAssistSupported()`**:
> For standard login/assist buttons, keeping the button visible and relying on `fallback` is recommended. Use `isHandleAssistSupported()` only if you want to conditionally render an optional inline browser-autofill icon inside the input element.

### 2. Result Data (`HandleAssistResult`)

When `requestHandleAssist()` succeeds, it returns the following object (or `null` if the user dismissed the chooser):

| Property | Type | Description |
| :--- | :--- | :--- |
| `username` | `string` | The selected Bluesky / atproto handle / username (e.g. `alice.bsky.social`) |
| `did` | `string` | The DID associated with the selected handle. Treat it as an unverified hint until OAuth completes. |
| `token` | `string` | The serialized FedCM handle-assist payload. It is not a bearer token, access token, or authentication credential. |

> [!NOTE]
> - **Automatic Input Fill (`targetInput`)**: If `targetInput` is provided, the selected username is automatically inserted into the input field, firing native `input` and `change` events (compatible with React, Vue, etc.).
> - **User Dismissal Behavior**: If the user closes the browser chooser (via Escape or backdrop click), `fallback` is NOT triggered and `null` is returned silently, preventing unwanted popups when canceled.
> - **Security Boundary**: FedCM results are handle-selection hints, not authentication credentials. Do not use `username`, `did`, or `token` to establish a login session or authorize API requests. Complete atproto OAuth with the returned username and rely on its verified result. The returned `token` is not a bearer token or access token.

### 3. Production Domain Verification

To use FedCM in production, your Relying Party origin must be verified in the [@passport Developer Portal](https://atpassport.net/developers/verify) via DNS TXT record or HTTP well-known file verification.
Verified domains can also display custom Privacy Policy and Terms of Service links directly in the browser's native chooser dialog.

---

## Explained: Parameters and Placeholders

When @passport redirects back to your `callbackUrl`, the following information will be attached as URL parameters.

### Basic Parameters (Automatically extracted by `parseCallback`)
- **`handle`**: Same value as `username`, also returned by `parseCallback()`.
- **`username`**: The authenticated user's Bluesky / atproto handle / username (e.g., `alice.bsky.social`).
- **`did`**: The user's Decentralized Identifier (DID). (e.g., `did:plc:xxxxxxxx`. Used to resolve the handle or communicate with the user's PDS.)
- **`pdsurl`**: The endpoint URL of the user's Personal Data Server (PDS).
- **`atpstate`**: The state string automatically generated for CSRF protection via `generateAuthUrl()`.

*Note: In the standard `generateAuthUrl` → `parseCallback` flow using `@atpassport/client`, @passport securely appends information as standard query parameters (e.g., `&username=...`). By using `parseCallback()`, you can easily receive all these parameters.*
