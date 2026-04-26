---
title: "About @passport"
last_updated: "April 5, 2026"
---

@passport is a handle management and authentication assistant for the [atproto](https://atproto.com) ecosystem.

Because atproto is decentralized, one-button authentication like "Login with Bluesky" is not available, and you have to enter your handle each time you authenticate with a new service. Bluesky handle strings are often long and, unfortunately, prone to input errors. Furthermore, general password managers store credentials per URL. In atproto, where users often use multiple applications, adding each service's URL to a password manager one by one becomes a hassle.

To solve this problem, we launched @passport as a mechanism that allows you to register your handle once and eliminate the need for manual handle entry across multiple atproto services.

```bluesky-embed
<blockquote class="bluesky-embed" data-bluesky-uri="at://did:plc:7qu7hsthk2mtm5ilru4umrsf/app.bsky.feed.post/3mjwipt2dbc2s" data-bluesky-cid="bafyreidrjblk3g2qt23y3yhh76n6oswqrwdrm3k4qst6n425sjs7dgfpva" data-bluesky-embed-color-mode="system"><p lang="en">Here is how it works on supported sites.
*Please note: Apps you are logging into for the first time will require an permission check.

Currently, the following three apps have native support:

chavatar.app
skyblur.uk
rito.blue

(4/4)<br><br><a href="https://bsky.app/profile/did:plc:7qu7hsthk2mtm5ilru4umrsf/post/3mjwipt2dbc2s?ref_src=embed">[image or embed]</a></p>&mdash; @passport (<a href="https://bsky.app/profile/did:plc:7qu7hsthk2mtm5ilru4umrsf?ref_src=embed">@atpassport.net</a>) <a href="https://bsky.app/profile/did:plc:7qu7hsthk2mtm5ilru4umrsf/post/3mjwipt2dbc2s?ref_src=embed">2026年4月20日 21:45</a></blockquote>
```

Only your "handle (e.g., @alice.bsky.social)" is stored on this server. Authentication information, including passwords and JWT tokens, is never stored on this server, so you can use it with peace of mind.

# Two Ways to Use @passport

This service can be used in two ways: "@passport Integration" by developers and "Browser Extension" by users.

We have also prepared a sharing feature to help you share your list of handles across multiple devices and browsers. The browser extension also automatically syncs with the browser you are using.

| | @passport Integration | Browser Extension |
| :--- | :--- | :--- |
| Overview | Developers integrate features into their site | Users install into their browser |
| Availability | Only on supported sites | Works even without @passport integration |
| Benefits | Seamless login experience | 1-tap handle input anywhere |
| Main Method | Site-side development | [Chrome Web Store](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) / [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/atpassport/) |

1. @passport Integration

   Allows for a "@passport Login" button. While this site only provides the functionality to return the handle back to each site, depending on the site's implementation, a seamless OAuth authentication flow can be achieved.

2. Browser Extension

   Chrome and Firefox versions of the extension are available on the [Chrome Web Store](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) and [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/atpassport/) so that it can be used even on sites that do not yet support @passport. This extension assists only with handle input, much like a password manager app.

# How to Use

In either pattern, you must first register your handle on this site.

## Registering a Handle
1. Go to the [top page](https://atpassport.net).
2. Tap the "+ Register handle" button.
3. Enter your handle.
4. Check the Terms of Service and Privacy Policy, then turn on the checkbox.
5. Tap the "Add" button.

If you have multiple handles, please repeat the above steps. Once registration is complete, you will no longer need to manually enter your handle in browser extensions or integrated apps.

Please note that the maximum number of registered handles is 15; you cannot register more than that.

## Multi-device Support
@passport provides a feature to share your handle list across multiple devices and browsers. This is called "Device Sharing." Once you perform this synchronization, any handle added in one browser will be reflected in others.

Please note that this operation will overwrite the content stored in the destination browser.

1. Go to the [top page](https://atpassport.net) on the source browser.
2. Tap the "Device Sharing" button.
3. Copy the URL and access it on the destination browser.
4. Tap the "Sync with original device content" button on the destination browser.

## Installing the Browser Extension

The browser extension is currently available for Chrome and Firefox.

1. Access the [Chrome Web Store](https://chrome.google.com/webstore/detail/ollhnghmplgpoebaceomdaigpkihpfkn) or [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/atpassport/).
2. Click the "Add to Chrome" or "Add to Firefox" button.
3. Follow the browser's instructions to complete the installation.

In each application, use it as follows:

1. On the screen where you enter your handle, tap the @passport extension.
2. Tap the handle you wish to enter.
3. Depending on the web app, the handle may be entered directly. If the @passport extension cannot recognize the handle input field, it will be copied to your clipboard, so please paste it yourself.

## Updating Metadata

If you change your handle or move your PDS, you will need to "Update Metadata."

1. Go to the [top page](https://atpassport.net).
2. Tap the three-dot menu icon next to the handle you want to update.
3. Tap "Update Metadata."

---

# For Developers
@passport provides two handle input methods.

### 1. @passport Integration
@passport integration works with the following mechanism:

1. Each app transitions to @passport with a `callback` parameter when the Login with @passport button is tapped.
2. @passport lists handles corresponding to that session. When a user taps a handle, the tapped handle is added to the `callback` specified in step 1, and the user is redirected.
3. Each app uses the returned handle to start the OAuth authentication flow.

It is also possible to implement cases where the scope differs depending on where the integration starts by defining the `scope` with custom parameters.

If you perform the redirection directly in step 2, you will be able to provide a more seamless login experience.

### 1-1. Using the Library
We provide an official client library written in TypeScript to provide a more advanced and seamless experience.

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
   https://your-app.com/callback?handle=alice.bsky.social&did=did%3Aplc%3Axxx&pdsurl=https%3A%2F%2Fpds.example.com&atpstate=xyz123
   ```

Using these, you can provide a smooth login experience without requiring users to manually input their handles.

> When users go through the @passport authentication flow, if the domain is not registered with @passport, a warning will be displayed indicating that the domain's ownership has not been verified. To provide a secure authentication experience, we recommend registering your domain via the [Developer Portal](/developers/verify).
> In some cases, the operator may reject the registered information.

We have a [sample application](/example) where you can check the actual behavior, including custom parameter passing and callback handling.

### 2. Extension Input Assist
In your web application's login forms, we recommend setting the following attributes for the handle input field (`<input>`):

- **`name="handle"`** (Most recommended): Allows the extension to identify the field most reliably.
- **`id="handle"`**: Can be used as a fallback if `name="handle"` does not work as expected.

By setting these, the @passport extension will automatically recognize the field, and values will be accurately reflected even on sites using advanced frameworks like React.

# Frequently Asked Questions (FAQ)

### Q: Is it free to use?
A: Yes, @passport is completely free to use.

### Q: Is it secure?
A: Yes. @passport only stores your public handle (e.g., @alice.bsky.social) and does not store passwords, private keys, JWT tokens, or any other sensitive information.

### Q: How can I delete my data?
A: You can delete individual handles from the list on the top page by tapping the menu icon (three dots) next to the handle and selecting "Delete". This will remove the data from your browser's local storage.

### Q: Does it support other social networks?
A: Currently, @passport only supports the atproto ecosystem, including Bluesky.

