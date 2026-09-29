/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { clearSafariCache, getSafariCachedAccounts, recordSafariMutation, SAFARI_CACHE_TTL, serializeSafariTask } from '../safariAccountCache';

const liveFetch = vi.hoisted(() => vi.fn());
vi.mock('../HandleManager', () => ({ HandleManager: class { fetchAccounts = liveFetch; } }));

describe('Safari session account cache', () => {
  let data: Record<string, any>;
  const normal = { windowId: 2, incognito: false };
  const accounts = [{ handle: 'alice.test', did: 'did:plc:alice' }];
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
    vi.resetAllMocks();
    data = {};
    vi.mocked(browser.storage.session.get).mockImplementation(async (key: any) => key === null ? { ...data } : { [key]: data[key] });
    vi.mocked(browser.storage.session.set).mockImplementation(async value => { Object.assign(data, value); });
    vi.mocked(browser.storage.session.remove).mockImplementation(async keys => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    });
    liveFetch.mockResolvedValue(accounts);
  });
  afterEach(() => vi.useRealTimers());

  it('retains accounts after closing the IdP tab without extending their lifetime', async () => {
    await getSafariCachedAccounts(normal);
    liveFetch.mockRejectedValue(new Error('safariOpenSite'));
    await expect(getSafariCachedAccounts(normal)).resolves.toEqual(accounts);
    vi.advanceTimersByTime(SAFARI_CACHE_TTL);
    await expect(getSafariCachedAccounts(normal)).rejects.toThrow('safariOpenSite');
    expect(Object.keys(data)).toHaveLength(0);
  });

  it('isolates windows and never saves or reads private accounts', async () => {
    await getSafariCachedAccounts(normal);
    liveFetch.mockResolvedValue([{ handle: 'private.test' }]);
    await getSafariCachedAccounts({ ...normal, incognito: true });
    liveFetch.mockRejectedValue(new Error('safariOpenSite'));
    await expect(getSafariCachedAccounts({ ...normal, windowId: 3 })).rejects.toThrow();
    await expect(getSafariCachedAccounts({ ...normal, incognito: true })).rejects.toThrow();
    await expect(getSafariCachedAccounts(normal)).resolves.toEqual(accounts);
  });

  it.each(['loginRequired', 'networkError', 'serverError_500', 'invalidResponse'])(
    'invalidates cached accounts after live failure: %s', async message => {
      await getSafariCachedAccounts(normal);
      liveFetch.mockRejectedValueOnce(new Error(message));
      await expect(getSafariCachedAccounts(normal)).rejects.toThrow(message);
      liveFetch.mockRejectedValue(new Error('safariOpenSite'));
      await expect(getSafariCachedAccounts(normal)).rejects.toThrow('safariOpenSite');
    });

  it('replaces an old account list with an empty list after deletion', async () => {
    await getSafariCachedAccounts(normal);
    liveFetch.mockResolvedValue([]);
    await getSafariCachedAccounts(normal);
    liveFetch.mockRejectedValue(new Error('safariOpenSite'));
    await expect(getSafariCachedAccounts(normal)).resolves.toEqual([]);
  });

  it('invalidates all windows during mutations and waits for every concurrent mutation', async () => {
    await getSafariCachedAccounts(normal);
    await getSafariCachedAccounts({ ...normal, windowId: 3 });
    await recordSafariMutation('a', true);
    await recordSafariMutation('b', true);
    await recordSafariMutation('a', false);
    await expect(getSafariCachedAccounts(normal)).rejects.toThrow('networkError');
    await recordSafariMutation('b', false);
    liveFetch.mockRejectedValue(new Error('safariOpenSite'));
    await expect(getSafariCachedAccounts(normal)).rejects.toThrow();
    await expect(getSafariCachedAccounts({ ...normal, windowId: 3 })).rejects.toThrow();
  });

  it('cannot restore stale cache after an invalidation queued during a fetch', async () => {
    let finish!: (value: unknown) => void;
    liveFetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const read = serializeSafariTask(() => getSafariCachedAccounts(normal));
    await vi.waitFor(() => expect(liveFetch).toHaveBeenCalled());
    const invalidate = serializeSafariTask(() => recordSafariMutation('logout', true));
    finish(accounts);
    await read;
    await invalidate;
    await recordSafariMutation('logout', false);
    liveFetch.mockRejectedValue(new Error('safariOpenSite'));
    await expect(getSafariCachedAccounts(normal)).rejects.toThrow();
  });

  it('clears a closed window without removing other window caches', async () => {
    await getSafariCachedAccounts(normal);
    await getSafariCachedAccounts({ ...normal, windowId: 3 });
    await clearSafariCache(2);
    liveFetch.mockRejectedValue(new Error('safariOpenSite'));
    await expect(getSafariCachedAccounts(normal)).rejects.toThrow();
    await expect(getSafariCachedAccounts({ ...normal, windowId: 3 })).resolves.toEqual(accounts);
  });

  it('rejects malformed or oversized account data', async () => {
    liveFetch.mockResolvedValue([{ did: 'missing-handle' }]);
    await expect(getSafariCachedAccounts(normal)).rejects.toThrow('invalidResponse');
    expect(Object.keys(data)).toHaveLength(0);
  });
});
