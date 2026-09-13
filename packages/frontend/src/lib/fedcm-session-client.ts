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
        if (result.ready === true && typeof navigator !== 'undefined') {
          try {
            await (navigator as Navigator & {
              login?: { setStatus: (status: 'logged-in' | 'logged-out') => Promise<void> };
            }).login?.setStatus('logged-in');
          } catch {
            // Login Status API is optional
          }
        }
        return result.ready === true;
      })
      .catch(() => {
        migrationPromise = null;
        return false;
      });
  }

  return migrationPromise;
}
