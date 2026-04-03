# @atpassport/client

[@passport](https://atpassport.net) is a service designed to eliminate the need for handle entry across applications in the atproto ecosystem.
Using this client library, you can integrate a @passport-powered "handle input assist feature" into your web applications.

*For the Japanese documentation, please see [README_ja.md](./README_ja.md).*

## Features
- **Zero dependencies**
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
import { AtPassport } from '@atpassport/client/core';

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
import { AtPassportUI } from '@atpassport/client/ui';

// English translations
console.log(AtPassportUI.en.title); // "Login with @passport"
console.log(AtPassportUI.en.description); // "@passport is a handle manager that eliminates the need for handle entry across atproto apps."

// Japanese translations
console.log(AtPassportUI.ja.title); // "@passportでログイン"
console.log(AtPassportUI.ja.description); // "@passportは、各atprotoアプリでハンドルを都度入力する手間が省ける共通ハンドルマネージャーです。"

// Standard Icon (SVG String)
const svgString = AtPassportUI.iconSvg;

// React Component
import { AtPassportIcon } from '@atpassport/client/ui';

// Use it in your React component
// <AtPassportIcon size={24} />
```

---

## Explained: Parameters and Placeholders

When @passport redirects back to your `callbackUrl`, the following information will be attached as URL parameters.

### Basic Parameters (Automatically extracted by `parseCallback`)
- **`handle`**: The authenticated user's Bluesky / atproto handle (e.g., `alice.bsky.social`).
- **`did`**: The user's Decentralized Identifier (DID). (e.g., `did:plc:xxxxxxxx`. Used to resolve the handle or communicate with the user's PDS.)
- **`pdsurl`**: The endpoint URL of the user's Personal Data Server (PDS).
- **`atpstate`**: The state string automatically generated for CSRF protection via `generateAuthUrl()`.

*Note: In the standard `generateAuthUrl` → `parseCallback` flow using `@atpassport/client`, @passport securely appends information as standard query parameters (e.g., `&handle=...`). By using `parseCallback()`, you can easily receive all these parameters.*
