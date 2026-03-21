# AtPassport Frontend

This is the frontend for AtPassport, built with Next.js and SST Ion.

## Getting Started

### Prerequisites

- AWS account and credentials configured locally.
- Node.js and `pnpm` installed.

### Local Development (with AWS resources)

To run the development server with SST Ion (recommended), which links to DynamoDB and other AWS resources:

1.  **Set the required secrets:**
    Before the first run, you need to set the `SessionSecret` (at least 32 characters).
    ```bash
    npx sst secret set SessionSecret a-very-secret-key-at-least-32-chars-long
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Run SST Dev:**
    ```bash
    pnpm run dev:local
    ```
    This will start the SST dev console and the Next.js dev server. It will also provision the necessary resources in your AWS account (in a dev stage).

### Troubleshooting

- **"Resource is not linked" Error:**
  If you see an error saying a resource is not linked, or if a previous deployment was interrupted, try refreshing the SST state:
  ```bash
  npx sst refresh
  ```
  Then restart `pnpm run dev:local`.

## Environment Variables

The project uses `.env.local` for local-only configuration that isn't managed by SST.

- `SESSION_SECRET`: Fallback secret for local-only runs (non-SST).
- `DYNAMODB_ENDPOINT`: Used if you are running a local DynamoDB instance.
