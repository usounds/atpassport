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

export const DEFAULT_CONTEXT_KEY = 'firefox-default';

export function normalizeContextKey(contextKey?: string): string {
  if (!contextKey || typeof contextKey !== 'string') return DEFAULT_CONTEXT_KEY;
  const trimmed = contextKey.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_CONTEXT_KEY;
}

export function getAccountStorageKey(
  origin: string,
  contextKey: string = DEFAULT_CONTEXT_KEY
): string | null {
  const normalized = normalizeIdpOrigin(origin);
  if (!normalized) return null;
  const ctx = normalizeContextKey(contextKey);
  return `${STORAGE_KEY_PREFIX}${ctx}:${normalized}`;
}

/**
 * Saves pushed accounts for a specific IdP origin and context in browser.storage.local.
 * If accounts is empty, the stored entry for this IdP is removed (logged-out state).
 */
export async function savePushedAccounts(
  origin: string,
  accounts: StoredAccount[],
  contextKey: string = DEFAULT_CONTEXT_KEY
): Promise<void> {
  const key = getAccountStorageKey(origin, contextKey);
  if (!key) {
    throw new Error(`Invalid IdP origin: ${origin}`);
  }

  const normalized = normalizeIdpOrigin(origin)!;

  if (!accounts || accounts.length === 0) {
    await browser.storage.local.remove(key);
    if (normalizeContextKey(contextKey) === DEFAULT_CONTEXT_KEY) {
      await browser.storage.local.remove(`${STORAGE_KEY_PREFIX}${normalized}`);
    }
    return;
  }

  const entry: StoredIdpEntry = {
    origin: normalized,
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
 * Retrieves pushed accounts for a specific IdP origin and context.
 */
export async function getPushedAccounts(
  origin: string,
  contextKey: string = DEFAULT_CONTEXT_KEY
): Promise<StoredAccount[]> {
  const key = getAccountStorageKey(origin, contextKey);
  if (!key) return [];

  // Legacy entries have no reliable context provenance. Revisit the IdP to repush.
  const result = await browser.storage.local.get([key]);
  const entry = result[key] as StoredIdpEntry | undefined;

  if (!entry || !Array.isArray(entry.accounts)) {
    return [];
  }

  return entry.accounts;
}

/**
 * Clears pushed accounts for an IdP origin and context.
 */
export async function clearPushedAccounts(
  origin: string,
  contextKey: string = DEFAULT_CONTEXT_KEY
): Promise<void> {
  const key = getAccountStorageKey(origin, contextKey);
  if (!key) return;
  await browser.storage.local.remove(key);
  if (normalizeContextKey(contextKey) === DEFAULT_CONTEXT_KEY) {
    const normalized = normalizeIdpOrigin(origin)!;
    await browser.storage.local.remove(`${STORAGE_KEY_PREFIX}${normalized}`);
  }
}
