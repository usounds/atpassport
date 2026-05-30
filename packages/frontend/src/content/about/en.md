---
title: "About @passport"
last_updated: "April 26, 2026"
---

@passport is a handle management and authentication assistant for the [atproto](https://atproto.com) ecosystem.

This page is an overview for people who are new to @passport. If you want to integrate @passport into an app, start with the [developer guide](/developers/guide).

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
Developers can integrate @passport directly into an atproto app, or make a login form easier for the @passport browser extension to detect.

For implementation details, callback parameters, client library usage, domain verification, and extension field attributes, see [Implement @passport in an atproto app](/developers/guide).

# Frequently Asked Questions (FAQ)

### Q: Is it free to use?
A: Yes, @passport is completely free to use. There are no ads or additional charges.

### Q: Is it secure and private?
A: Yes. @passport only stores your public handle (e.g., @alice.bsky.social). Sensitive information such as passwords, private keys, or JWT tokens are never stored on our servers.

### Q: Is there a limit to the number of handles I can register?
A: You can register up to 15 handles per session.

### Q: What happens to my data if I don't use the service for a long time?
A: Based on our Terms of Service, handle information that hasn't been used for 365 days may be deleted without prior notice.

### Q: Can I sync my registered handles across multiple devices?
A: Yes. By using the 'Device Sharing' feature, you can sync your handle list with other browsers or devices via QR code or URL.

### Q: What are the benefits of registering a domain in the Developer Portal?
A: By verifying domain ownership through the Developer Portal, you can remove warnings for that specific domain.

### Q: How do the browser extension and integrated sites work together?
A: @passport is designed as an ecosystem. Once you register your handles on this site, you can log in with a single button on supported sites. On unsupported sites, the browser extension allows you to input those same handles with one tap. In both cases, your registration connects your experience seamlessly across multiple sites.

### Q: What should I do if I change my handle or move to a different PDS?
A: If your handle string changes or you move to a different PDS (server), you need to perform a 'Metadata Update.' Open the menu next to the handle on the top page and tap 'Update Metadata.' This will reflect the new information in @passport and ensure you can continue to log in correctly.

### Q: How can I delete my registered data?
A: You can delete individual handles at any time by tapping the three-dot menu next to the handle on the top page and selecting 'Delete'.

### Q: Does it support other social networks?
A: @passport supports the atproto ecosystem.
