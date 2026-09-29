import { HandleManager, type AccountItem } from './HandleManager';
import type { AccountTabContext } from './safariAccounts';

export const SAFARI_CACHE_TTL = 60 * 60 * 1000;
const PREFIX = 'safari-accounts-v1:';
const PENDING = 'safari-account-mutations-v1';
let queue: Promise<unknown> = Promise.resolve();

// All callers run in the background. Serialize refreshes and invalidations so an
// earlier network response cannot restore entries after a logout invalidation.
export function serializeSafariTask<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
}

export async function clearSafariCache(windowId?: number) {
  if (windowId !== undefined) {
    await browser.storage.session.remove(`${PREFIX}${windowId}`);
    return;
  }
  const all = await browser.storage.session.get(null);
  await browser.storage.session.remove(Object.keys(all).filter(key => key.startsWith(PREFIX)));
}

export function sanitizeAccounts(value: unknown): AccountItem[] {
  if (!Array.isArray(value) || value.length > 200) throw new Error('invalidResponse');
  return value.map(item => {
    if (!item || typeof item.handle !== 'string' || !item.handle || item.handle.length > 253) {
      throw new Error('invalidResponse');
    }
    const result: AccountItem = { handle: item.handle };
    for (const key of ['did', 'displayName', 'avatar'] as const) {
      if (typeof item[key] === 'string' && item[key].length <= 2048) result[key] = item[key];
    }
    return result;
  });
}

async function pendingMutations(): Promise<Record<string, number>> {
  const stored = (await browser.storage.session.get(PENDING))[PENDING];
  const pending = stored && typeof stored === 'object' ? stored as Record<string, number> : {};
  for (const [id, time] of Object.entries(pending)) {
    if (typeof time !== 'number' || Date.now() - time > 60000) delete pending[id];
  }
  return pending;
}

export async function recordSafariMutation(requestId: string, started: boolean) {
  // Invalidate all windows conservatively: cookie stores may be shared, while
  // Safari does not expose a stable profile ID that we could safely use here.
  await clearSafariCache();
  const pending = await pendingMutations();
  if (started) pending[requestId] = Date.now();
  else delete pending[requestId];
  await browser.storage.session.set({ [PENDING]: pending });
}

export async function getSafariCachedAccounts(context: AccountTabContext, refreshOnly = false) {
  if (Object.keys(await pendingMutations()).length) throw new Error('networkError');
  const key = `${PREFIX}${context.windowId}`;
  try {
    const accounts = sanitizeAccounts(await new HandleManager().fetchAccounts(context));
    if (!context.incognito) {
      await browser.storage.session.set({ [key]: {
        version: 1, expiresAt: Date.now() + SAFARI_CACHE_TTL, accounts,
      } });
    }
    return accounts;
  } catch (error) {
    const missingTab = error instanceof Error && error.message === 'safariOpenSite';
    if (!missingTab) {
      // Includes 401, invalid JSON, network errors and rate limiting. Never
      // conceal a failed live refresh by returning a previous identity list.
      if (!context.incognito) await clearSafariCache();
      throw error;
    }
    if (!context.incognito && !refreshOnly) {
      const value = (await browser.storage.session.get(key))[key];
      const entry = value && typeof value === 'object' ? value as Record<string, unknown> : null;
      if (entry?.version === 1 && typeof entry.expiresAt === 'number' && Number.isFinite(entry.expiresAt) &&
          entry.expiresAt > Date.now() && entry.expiresAt <= Date.now() + SAFARI_CACHE_TTL) {
        try { return sanitizeAccounts(entry.accounts); } catch { /* discard corrupt entry */ }
      }
      await clearSafariCache(context.windowId);
    }
    throw error;
  }
}
