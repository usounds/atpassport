---
title: Privacy Policy
last_updated: "March 29, 2026"
---

## 1. Information We Collect
This Service collects and stores the following information:

- atproto handles registered by users
- DID associated with each handle
- PDS URL information
- Session identifiers
- Verified domain names and their identifiers (for developers)

## 2. How We Use Information
The collected information is used for:

- Displaying and managing user-registered handles
- Resolving PDS and DID information for each handle
- Providing domain ownership verification status

## 3. Information Sharing
We do not sell or share the information corresponding to 1 with third parties.

## 4. Data Storage
Your data is stored securely using AWS DynamoDB.

## 5. Cookies and Browser/Extension Storage
This Service uses session cookies to maintain your authenticated state. These cookies are essential for the functioning of this Service.

Additionally, to provide handle input assist features via W3C FedCM (Federated Credential Management) and IdP Registration, registered account details (handle, DID, display name, avatar URL) are temporarily synchronized and stored (Accounts Push) in the credential storage of supported browsers (such as Chrome) and the local storage of the official @passport extension (such as Firefox). This information is never transmitted to third-party relying parties without explicit user selection (Zero-Network principle).

## 6. Data Deletion and Unregistration
You may delete or withdraw your registered handles or domains at any time through the Service interface.

- **Synchronized Account Data in Browser / Extension**: When you remove a handle from your account list or log out, synchronized data stored in your browser or extension is automatically updated or cleared (with immediate purging upon `logged-out` signal when all handles are deleted).
- **IdP Unregistration**: If registered as an IdP in your browser, you may unregister at any time using the "IdP Registration" section on the home page or via browser settings.

## 7. Contact
For questions regarding this Privacy Policy, please contact usounds.work.
