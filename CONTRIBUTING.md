# Contributing to @passport

Thank you for your interest in contributing to @passport! We welcome contributions from everyone.

## How to Contribute

### Reporting Bugs

If you find a bug, please open a GitHub Issue and include:
- A clear, descriptive title.
- Steps to reproduce the issue.
- Expected behavior vs. actual behavior.
- Screenshots or logs if applicable.

### Suggesting Features

We love new ideas! To suggest a feature, please open a GitHub Issue and describe the functionality you'd like to see and why it would be useful.

### Contributing Code

1. **Fork the repository** and create a branch from `main`.
2. **Set up the development environment**:
   - Ensure you have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed.
   - Run `pnpm install` in the root directory.
3. **Make your changes**.
4. **Run tests and linting**:
   - Run `pnpm test` to ensure all tests pass.
   - Run `pnpm lint` to check for code style issues.
5. **Submit a Pull Request**:
   - **Submit your Pull Request to the `preview` branch**.
   - Provide a clear description of the changes.
   - Link any related issues.

### Adding Translations (i18n)

@passport supports multiple languages. To contribute a new translation or improve an existing one:

> **Note**: Languages other than Japanese are currently machine-translated. We highly appreciate any contributions to improve these translations with more natural expressions.

1. **Locate the message files** in `packages/frontend/messages/`.
2. **Add or edit the JSON file** for your language (e.g., `fr.json` for French).
3. **Register the new locale** in `packages/frontend/src/i18n/routing.ts` by adding the language code to the `locales` array.
4. **Submit a Pull Request**.

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.
