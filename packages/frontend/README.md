# @passport Frontend

This is the frontend for @passport, built with Next.js.

## Getting Started

### Prerequisites

- Node.js and `pnpm` installed.

### Local Development

To run the development server locally (using an in-memory stub for DynamoDB):

1.  **Set the required secrets:**
    Before the first run, create a `.env.local` file and set the `SESSION_SECRET` (at least 32 characters).
    ```bash
    SESSION_SECRET=a-very-secret-key-at-least-32-chars-long
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Run Dev Server:**
    ```bash
    pnpm run dev
    ```
    This will start the Next.js dev server. By default, it uses an in-memory stub for DynamoDB, so no AWS setup is required for basic local testing.

## Environment Variables

The project uses `.env.local` for local-only configuration.

- `SESSION_SECRET`: Secret key for session/cookie encryption (at least 32 characters).
