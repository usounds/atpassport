# @passport

@passport is a handle manager designed to assist users in managing their handles within the atproto ecosystem.

*For the Japanese documentation, please see [README_ja.md](./README_ja.md).*

## Features

- **UUID-based Session Management**: Multiple DIDs can be linked to a single browser session (UUID).
- **Signed Cookies**: Secure session cookies (`HttpOnly`, `Secure`) to prevent tampering.
- **Multilingual Support (i18n)**: Standard support for Japanese and English.
- **Mantine UI**: Modern user interface for handle management.

## Directory Structure

- `/frontend`: The main application built with Next.js (App Router). See [frontend/README.md](./frontend/README.md) for setup and build instructions.
- `/packages/atpassport-client`: A client library for external applications.
- `/packages/atpassport-extension`: Browser extension for Chrome.

## License

MIT
