let migrationPromise: Promise<boolean> | null = null;

export function ensureFedCmSession(): Promise<boolean> {
  if (!migrationPromise) {
    migrationPromise = fetch('/api/fedcm/migrate', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) return false;
        const statusResponse = await fetch('/api/fedcm/status', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (!statusResponse.ok) return false;
        const result = await statusResponse.json() as { ready?: unknown };
        return result.ready === true;
      })
      .catch(() => {
        migrationPromise = null;
        return false;
      });
  }

  return migrationPromise;
}
