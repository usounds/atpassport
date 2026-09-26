import { browser } from 'wxt/browser';

export interface StoredAccount {
  id: string; // did:plc:...
  name: string; // display name or handle
  username: string; // @handle.bsky.social
  picture?: string;
}

export interface StoredIdpEntry {
  origin: string;
  accounts: StoredAccount[];
  updatedAt: number;
}

export const STORAGE_KEY_PREFIX = 'fedcm_idp_accounts:';

export function normalizeIdpOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    const isLoopback =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]';

    if (isLoopback) {
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    } else {
      if (url.protocol !== 'https:') return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export function getAccountStorageKey(origin: string): string | null {
  const normalized = normalizeIdpOrigin(origin);
  return normalized ? `${STORAGE_KEY_PREFIX}${normalized}` : null;
}

/**
 * Saves pushed accounts for a specific IdP origin in browser.storage.local.
 * If accounts is empty, the stored entry for this IdP is removed (logged-out state).
 */
export async function savePushedAccounts(
  origin: string,
  accounts: StoredAccount[]
): Promise<void> {
  const key = getAccountStorageKey(origin);
  if (!key) {
    throw new Error(`Invalid IdP origin: ${origin}`);
  }

  if (!accounts || accounts.length === 0) {
    await browser.storage.local.remove(key);
    return;
  }

  const entry: StoredIdpEntry = {
    origin: normalizeIdpOrigin(origin)!,
    accounts: accounts.map((acc) => ({
      id: String(acc.id),
      name: String(acc.name || acc.username || acc.id),
      username: String(acc.username || acc.name || acc.id),
      ...(acc.picture ? { picture: String(acc.picture) } : {}),
    })),
    updatedAt: Date.now(),
  };

  await browser.storage.local.set({ [key]: entry });
}

/**
 * Retrieves pushed accounts for a specific IdP origin.
 */
export async function getPushedAccounts(origin: string): Promise<StoredAccount[]> {
  const key = getAccountStorageKey(origin);
  if (!key) return [];

  const result = await browser.storage.local.get(key);
  const entry = result[key] as StoredIdpEntry | undefined;
  if (!entry || !Array.isArray(entry.accounts)) {
    return [];
  }

  return entry.accounts;
}

/**
 * Clears pushed accounts for an IdP origin.
 */
export async function clearPushedAccounts(origin: string): Promise<void> {
  const key = getAccountStorageKey(origin);
  if (!key) return;
  await browser.storage.local.remove(key);
}
