---
title: "About @passport"
last_updated: "March 29, 2026"
---

@passport is a handle management and authentication assistant for the atproto ecosystem.

Because atproto is decentralized, one-button authentication like "Login with Bluesky" is not available, and you have to enter your handle each time you authenticate with each service. Bluesky handle strings are long and can easily lead to input errors.

To solve this problem, we launched @passport as a mechanism that allows handles, once registered with @passport, to be reused across multiple atproto services.

Only the "handle (e.g., @alice.bsky.social)" is stored on this server. Authentication information, including passwords, is never stored on this server, so you can use it with peace of mind.

## Two Ways to Use @passport

This service can be used in two ways: "@passport Integration" by developers and "Browser Extension" by users.

We have also prepared a sharing feature so that you can share your list of handles across multiple devices and browsers. The browser extension also automatically syncs with the browser you are using.

| | @passport Integration | Browser Extension |
| :--- | :--- | :--- |
| Overview | Integrating features into the site | Installing into the browser |
| Availability | Only on supported sites | All sites (works on non-ready sites) |
| Benefits | Seamless login experience | 1-tap handle input anywhere |
| Main Method | Site-side development | [Chrome Web Store](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) / [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/atpassport/) |

1. @passport Integration

   Allows for a "@passport Login" button. While this site only provides the functionality to return the handle back to each site, depending on the site's implementation, a seamless OAuth authentication flow can be achieved.

1. Browser Extension

   Chrome and Firefox versions of the extension are available on the [Chrome Web Store](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/atpassport/) so that it can be used even on sites that do not yet support @passport. This extension assists only with handle input, much like a password manager app.

---

## For Developers
@passport provides two handle input methods.

### 1. @passport Integration
@passport integration works with the following mechanism:

1. Each app transitions to @passport with a `callback` parameter when the authentication button in @passport is tapped.
2. @passport lists handles corresponding to that session. When a user taps a handle, the tapped handle is added to the `callback` specified in step 1, and the user is redirected.
3. Each app uses the returned handle to start the OAuth authentication flow.

It is also possible to implement cases where the scope differs depending on where the integration starts by defining the `scope` with custom parameters.

If you perform the redirection directly in step 2, you will be able to provide a more seamless login experience.

### 1-1. Using the Library
We provide an official client library written in TypeScript to provide a more advanced and seamless experience (such as adding a "@passport Login" button).

```bash
npm install @atpassport/client
```

This library includes React components and helper classes for integration that can be directly integrated into your application. For more details, please check [@atpassport/client (npm)](https://www.npmjs.com/package/@atpassport/client) and the [GitHub repository](https://github.com/usounds/atpassport).

### 1-2. Without Using the Library
It is also possible to link handle information directly via HTTP redirect without using the library.

1. **Redirect to Authentication Screen**
   Redirect users to the following URL with the required parameters.
   - `https://atpassport.net/authentication`
   - **Parameters**:
     - `callback`: The return URL after successful authentication.
     - `atpstate` (Optional): A random string for CSRF protection. If provided, it will be returned as-is on callback. Recommended for security.

   **Redirect Example:**
   ```url
   https://atpassport.net/authentication
     ?callback=https%3A%2F%2Fyour-app.com%2Fcallback
     &atpstate=xyz123
   ```

2. **Handle Callback**
   After authentication, the user will be redirected back to your `callback` URL with the following query parameters:
   - `handle`: The authenticated handle.
   - `did`: The handle's DID.
   - `pdsurl`: The PDS URL.
   - `atpstate`: If provided during the request, the same string will be returned.

   **Callback Example:**
   ```
   https://your-app.com/callback?handle=user.bsky.social&did=did:plc:xxx&pdsurl=https://pds.example.com&atpstate=xyz123
   ```

Using these, you can provide a smooth login experience without requiring users to manually input their handles.

> When users go through the @passport authentication flow, if the domain is not registered with @passport, a warning will be displayed indicating that the domain's ownership has not been verified. To provide a secure authentication experience, we recommend registering your domain via the [Developer Portal](/developers/verify).
> In some cases, the operator may reject the registered information.

We have a [sample application](/example) where you can check the actual behavior, including custom parameter passing and callback handling.

### 2. Extension Input Assist
In your web application's login forms, set the `name` attribute of the handle input field (`<input>`) to `handle`.
This allows the @passport extension to automatically recognize the field and automatically reflect the value in the input field when a user selects a handle from the extension.
