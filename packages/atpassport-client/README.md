# @atpassport/client

[@passport](https://atpassport.net) is an authentication provider tailored for the atproto ecosystem.
Using this client library, you can easily integrate a @passport-powered "handle input assist feature" into your applications (such as browser extensions or web apps) with an OAuth-like flow.

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
  callbackUrl: 'https://myapp.com/oauth/login', // Required: the URL to redirect back to
  lang: 'en' // Optional: 'en' or 'ja' (defaults to no prefix if omitted)
});

// 2. (Optional) Generate the authentication URL and redirect
// You can pass custom parameters (e.g., redirect_uri to return to the original page)
const { url, atpstate } = passport.generateAuthUrl({
  redirect_uri: '/dashboard'
});

// 3. (Optional) For security, save the generated atpstate to sessionStorage or cookies to prevent CSRF
sessionStorage.setItem('atpstate', atpstate);

// 4. Redirect the user to the @passport handle selection screen
window.location.assign(url);
```

```typescript
// Receive the parameters on your callback page (https://myapp.com/oauth/callback)
// (Optional) By passing the saved atpstate as the second argument, parseCallback will automatically
// throw an Error if the states don't match (preventing CSRF attacks).
const savedState = sessionStorage.getItem('atpstate');
const result = passport.parseCallback(window.location.href, savedState);

console.log('Login successful:', result);
console.log('Authenticated User:', result.handle);
console.log('Custom Parameters:', result.customParams['redirect_uri']); // Outputs '/dashboard'
```

## Standard UI Texts and Icons for Integration

To make it easy for developers to build consistent "Login with @passport" buttons and dialogs, the client library exports standard texts and an SVG icon via the `AtPassportUI` constant.

```typescript
import { AtPassportUI } from '@atpassport/client/ui';

// English translations
console.log(AtPassportUI.en.title); // "Login with @passport"
console.log(AtPassportUI.en.description); // "@passport is a universal handle manager..."

// Japanese translations
console.log(AtPassportUI.ja.title); // "@passportでログイン"

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

*Note: With the standard flow using `@atpassport/client` (`generateAuthUrl` → `parseCallback`), @passport securely appends parameters like `&handle=...` as standardized URL queries. This allows you to simply and securely receive all information using `parseCallback()` without manually formatting placeholders.*
