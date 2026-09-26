export interface FedCmAccount {
  id: string; // DID
  name: string; // Display name or handle
  username: string; // @handle
  picture?: string; // Avatar URL
  approved_clients: string[]; // Approved client IDs
}

/**
 * Maps an association and optional profile to standard FedCmAccount format.
 */
export function toFedCmAccount(item: {
  did: string;
  handle: string;
  profile?: { displayName?: string; avatar?: string } | null;
}): FedCmAccount {
  const cleanHandle = item.handle.replace(/^@/, '');
  const displayName = item.profile?.displayName?.trim();
  return {
    id: item.did,
    name: displayName || cleanHandle,
    username: `@${cleanHandle}`,
    ...(item.profile?.avatar ? { picture: item.profile.avatar } : {}),
    approved_clients: [],
  };
}

/**
 * Returns the absolute config URL for AtPassport FedCM based on current window origin.
 */
export function getFedCmConfigUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/fedcm/config.json`;
  }
  return 'https://atpassport.net/fedcm/config.json';
}

/**
 * Checks if the browser supports the FedCM Login Status API (navigator.login.setStatus).
 */
export function hasLoginStatusSupport(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'login' in navigator &&
    typeof (navigator as Navigator & { login?: { setStatus?: unknown } }).login?.setStatus ===
      'function'
  );
}

/**
 * Checks if the browser supports IdP Registration (IdentityProvider.register).
 */
export function hasIdpRegistrationSupport(): boolean {
  if (typeof window === 'undefined') return false;
  const idp = (
    window as unknown as {
      IdentityProvider?: { register?: unknown; unregister?: unknown };
    }
  ).IdentityProvider;
  return typeof idp?.register === 'function' && typeof idp?.unregister === 'function';
}

/**
 * Pushes the current accounts list to the browser via navigator.login.setStatus.
 * Implements a 2-step fallback:
 * 1. Tries Accounts Push with accounts options: setStatus('logged-in', { accounts })
 * 2. Falls back to baseline Login Status API: setStatus('logged-in') if 2 arguments are rejected.
 * When accounts array is empty, calls setStatus('logged-out').
 * All exceptions are caught silently to prevent interrupting user actions.
 */
export async function syncAccountsPush(accounts: FedCmAccount[]): Promise<void> {
  if (typeof navigator === 'undefined') return;

  const nav = navigator as Navigator & {
    login?: {
      setStatus: (
        status: 'logged-in' | 'logged-out',
        options?: { accounts: FedCmAccount[] }
      ) => Promise<void>;
    };
  };

  if (!nav.login?.setStatus) return;

  try {
    if (accounts.length > 0) {
      try {
        console.log('[FedCM Push] Calling nav.login.setStatus("logged-in", { accounts }) with %d accounts:', accounts.length, accounts.map(a => a.username));
        // Step 1: Attempt Accounts Push (W3C proposal)
        await nav.login.setStatus('logged-in', { accounts });
        console.log('[FedCM Push] Successfully pushed accounts via navigator.login.setStatus!');
      } catch (pushErr) {
        // Step 2: Fallback to baseline single-argument Login Status API
        console.debug('[FedCM Push] 2-arg setStatus failed, falling back to 1-arg:', pushErr);
        await nav.login.setStatus('logged-in');
      }
    } else {
      console.log('[FedCM Push] Calling nav.login.setStatus("logged-out")');
      await nav.login.setStatus('logged-out');
    }
  } catch (error) {
    console.debug('[FedCM Push] setStatus failed (safely ignored):', error);
  }
}

/**
 * Registers this IdP in the browser via IdentityProvider.register.
 */
export async function registerIdp(
  configURL: string = getFedCmConfigUrl()
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'no_window' };

  const idp = (
    window as unknown as {
      IdentityProvider?: { register: (url: string) => Promise<void> };
    }
  ).IdentityProvider;

  if (!idp?.register) {
    return { success: false, error: 'not_supported' };
  }

  try {
    await idp.register(configURL);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Unregisters this IdP from the browser via IdentityProvider.unregister.
 */
export async function unregisterIdp(
  configURL: string = getFedCmConfigUrl()
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') return { success: false, error: 'no_window' };

  const idp = (
    window as unknown as {
      IdentityProvider?: { unregister: (url: string) => Promise<void> };
    }
  ).IdentityProvider;

  if (!idp?.unregister) {
    return { success: false, error: 'not_supported' };
  }

  try {
    await idp.unregister(configURL);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

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
        const result = (await statusResponse.json()) as { ready?: unknown };
        if (result.ready === true && typeof navigator !== 'undefined') {
          try {
            await (
              navigator as Navigator & {
                login?: { setStatus: (status: 'logged-in' | 'logged-out') => Promise<void> };
              }
            ).login?.setStatus('logged-in');
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
