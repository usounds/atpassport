# @passport

@passport is a handle manager designed to assist users in managing their handles within the atproto ecosystem.

*For the Japanese documentation, please see [README_ja.md](./README_ja.md).*

## Features

- **UUID-based Session Management**: Multiple DIDs can be linked to a single browser session (UUID).
- **Signed Cookies**: Secure session cookies (`HttpOnly`, `Secure`) to prevent tampering.
- **Identity Resolution via JWT**: External applications can securely obtain user DIDs through the @passport API.
- **Multilingual Support (i18n)**: Standard support for Japanese and English.
- **Mantine UI**: Modern user interface for handle management.

## Directory Structure

- `/frontend`: The main application built with Next.js (App Router).
- `/packages/atpassport-client`: A client library for external applications.

## Setup

### Install Dependencies

```bash
pnpm install
```

### Environment Variables (`frontend/.env.local`)

```env
# Session Management
SESSION_SECRET=your-secure-session-secret
```

### Build

```bash
pnpm build
```

## Client Library (`@atpassport/client`)

We provide a client library for integrating @passport into external applications.
For more details, please refer to [packages/atpassport-client/README.md](./packages/atpassport-client/README.md).

## License

MIT
