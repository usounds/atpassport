---
title: "About @passport"
last_updated: "March 21, 2026"
---

@passport is a handle management and authentication assistant for the atproto ecosystem.

## Two Ways to Use @passport

@passport consists of two approaches: "Site-side Optimization" by developers and "Browser Extensions" by users.

| | @passport Integration | Browser Extension |
| :--- | :--- | :--- |
| Overview | Integrating features into the site | Installing into the browser |
| Availability | Only on supported sites | All sites (works on non-ready sites) |
| Benefits | Best login experience | 1-tap handle input anywhere |
| Main Method | Site-side development | [Available on Chrome Web Store](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) |


## For Users
Avoid the hassle of typing your handle every time and enjoy a smooth login experience on supported services.

Registered handles are stored on the server. Sensitive information such as passwords is never stored on this server. The session key is stored securely in your browser's cookies.

Extensions for Chrome are [available on the Chrome Web Store](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) to enable use on sites that do not yet support @passport.

These extensions will allow you to automatically reflect your handle in input fields even on sites that do not support @passport, significantly reducing the effort required during login on any site.

---

## For Developers
@passport is a tool designed to enhance the user experience of applications using atproto.
Developers can integrate with @passport in the following ways:

### 1. Extension Input Assist
In your web application's login forms, set the `name` attribute of the handle input field (`<input>`) to `handle`.
This allows the @passport extension to automatically recognize the field and reflect the selected handle directly into the input field when the user taps it in the extension.

### 2-1. Using the Library
To provide a more advanced and seamless experience (such as adding a "@passport Login" button), we provide an official client library.

```bash
npm install @atpassport/client
```

This library includes React components and helper classes for integration that can be directly integrated into your application. For more details, please check [@atpassport/client (npm)](https://www.npmjs.com/package/@atpassport/client) and the [GitHub repository](https://github.com/usounds/atpassport).

### 2-2. Without Using the Library
It is also possible to link handle information directly via HTTP redirect without using the library.

1. **Redirect to Authentication Screen**
   Redirect users to the following URL with the required parameters.
   - `https://atpassport.net/en/authentication`
   - **Parameters**:
     - `callback`: The return URL after successful authentication.
     - `atpstate` (Optional): A random string for CSRF protection. If provided, it will be returned as-is on callback. Recommended for security.

   **Redirect Example:**
   ```url
   https://atpassport.net/en/authentication
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

We have a [sample application](/example) where you can check the actual behavior, including custom parameter passing and callback handling.
