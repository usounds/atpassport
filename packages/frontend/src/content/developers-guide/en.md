---
title: "Implement @passport in an atproto app"
last_updated: "May 30, 2026"
---

@passport provides two handle input methods for atproto apps: direct @passport integration and browser extension input assist.

## 1. @passport Integration

@passport integration works with the following mechanism:

1. Each app transitions to @passport with a `callback` parameter when the Login with @passport button is tapped.
2. @passport lists handles corresponding to that session. When a user taps a handle, the tapped handle is added to the `callback` specified in step 1, and the user is redirected.
3. Each app uses the returned handle to start the OAuth authentication flow.

It is also possible to implement cases where the scope differs depending on where the integration starts by defining the `scope` with custom parameters.

If you perform the redirection directly in step 2, you will be able to provide a more seamless login experience.

## 1-1. Using the Library

We provide an official client library written in TypeScript to provide a more advanced and seamless experience.

```bash
npm install @atpassport/client
```

This library includes React components and helper classes for integration that can be directly integrated into your application. For more details, please check [@atpassport/client (npm)](https://www.npmjs.com/package/@atpassport/client) and the [GitHub repository](https://github.com/usounds/atpassport).

## 1-2. Without Using the Library

It is also possible to link handle information directly via HTTP redirect without using the library.

1. **Redirect to Authentication Screen**
   Redirect users to the following URL with the required parameters.
   - `https://atpassport.net/authentication`
   - **Parameters**:
     - `callback`: The return URL after successful authentication.
     - `atpstate` (Optional): A random string for CSRF protection. If provided, it will be returned as-is on callback. Recommended for security.

   **Redirect Example:**
   ```url
   https://atpassport.net/authentication?callback=https%3A%2F%2Fyour-app.com%2Fcallback&atpstate=xyz123
   ```

2. **Handle Callback**
   After authentication, the user will be redirected back to your `callback` URL with the following query parameters:
   - `handle`: The authenticated handle.
   - `did`: The handle's DID.
   - `pdsurl`: The PDS URL.
   - `atpstate`: If provided during the request, the same string will be returned.

   **Callback Example:**
   ```url
   https://your-app.com/callback?handle=alice.atproto.site&did=did%3Aplc%3Axxx&pdsurl=https%3A%2F%2Fpds.example.com&atpstate=xyz123
   ```

Using these, you can provide a smooth login experience without requiring users to manually input their handles.

> When users go through the @passport authentication flow, if the domain is not registered with @passport, a warning will be displayed indicating that the domain's ownership has not been verified. To provide a secure authentication experience, we recommend registering your domain via the [Developer Portal](/developers/verify).
> In some cases, the operator may reject the registered information.

We have a [sample application](/example) where you can check the actual behavior, including custom parameter passing and callback handling.

## 2. Extension Input Assist

In your web application's login forms, we recommend setting the following attributes for the handle input field (`<input>`):

- **`name="handle"`** (Most recommended): Allows the extension to identify the field most reliably.
- **`id="handle"`**: Can be used as a fallback if `name="handle"` does not work as expected.

By setting these, the @passport extension will automatically recognize the field, and values will be accurately reflected even on sites using advanced frameworks like React.

## Frequently asked questions

### What does @passport add to an atproto app?

@passport lets users choose a previously registered handle and returns the handle, DID, and PDS URL to your callback so your app can start its own OAuth flow.

### Do I need the @atpassport/client library?

No. The TypeScript client library is recommended for React apps, but the same flow can be implemented with a direct redirect to the @passport authentication endpoint.

### Why should I verify my domain?

Verified domains avoid the unverified-domain warning during @passport authentication and give users a clearer trust signal before they continue.
