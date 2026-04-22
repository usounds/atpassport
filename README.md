# @passport

@passport is a handle manager designed to assist users in managing their handles within the atproto ecosystem.

*For the Japanese documentation, please see [README_ja.md](./README_ja.md).*

## Features

- **UUID-based Session Management**: Multiple DIDs can be linked to a single browser session (UUID).
- **Signed Cookies**: Secure session cookies (`HttpOnly`, `Secure`) to prevent tampering.
- **Multilingual Support (i18n)**: Support for English, Japanese, Portuguese, German, French, and Spanish.
- **Mantine UI**: Modern user interface for handle management.

## Directory Structure

- `/packages/frontend`: The main application built with Next.js (App Router). See [packages/frontend/README.md](./packages/frontend/README.md) for setup and build instructions.
- `/packages/atpassport-client`: A client library for external applications.
- `/packages/atpassport-extension`: Browser extension for Chrome and Firefox.

## Contributing
Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to report bugs, suggest features, and contribute code or translations.

## License

MIT
