/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HandleManager } from '../HandleManager';
import { fetchSafariAccounts } from '../safariAccounts';

describe('Safari account transport', () => {
  const tab = { id: 4, windowId: 2, incognito: false, url: 'https://atpassport.net/en' };
  const context = { windowId: 2, incognito: false };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('BROWSER', 'safari');
    vi.mocked(browser.tabs.query).mockResolvedValue([tab] as any);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('returns accounts through the matching site tab', async () => {
    vi.mocked(browser.scripting.executeScript).mockResolvedValue([
      { result: { status: 200, data: { accounts: [{ handle: 'alice.test' }] } } },
    ] as any);
    const response = await fetchSafariAccounts();
    await expect(response.json()).resolves.toEqual({ accounts: [{ handle: 'alice.test' }] });
    expect(browser.tabs.query).toHaveBeenLastCalledWith({ windowId: 2, url: 'https://atpassport.net/*' });
    expect(browser.scripting.executeScript).toHaveBeenCalledWith(expect.objectContaining({
      target: { tabId: 4, frameIds: [0] }, world: 'ISOLATED',
    }));
  });

  it('routes popup requests through the background cache service', async () => {
    vi.mocked(browser.runtime.sendMessage).mockResolvedValue({ success: true, accounts: [{ handle: 'alice.test' }] } as any);
    await expect(new HandleManager().fetchAccounts()).resolves.toEqual([{ handle: 'alice.test' }]);
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ type: 'FETCH_ACCOUNTS' });
    expect(browser.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('uses the requesting window for background requests', async () => {
    vi.mocked(browser.scripting.executeScript).mockResolvedValue([
      { result: { status: 200, data: { handles: ['alice.test'] } } },
    ] as any);
    await expect(new HandleManager().fetchAccounts(context)).resolves.toEqual([{ handle: 'alice.test' }]);
    expect(browser.tabs.query).toHaveBeenCalledExactlyOnceWith({ windowId: 2, url: 'https://atpassport.net/*' });
  });

  it.each([
    { tabs: [] }, { tabs: [{ ...tab, windowId: 3 }] }, { tabs: [{ ...tab, incognito: true }] },
    { tabs: [{ ...tab, url: 'https://atpassport.net.evil.test/' }] },
  ])('does not use unrelated browsing contexts: %j', async ({ tabs }) => {
    vi.mocked(browser.tabs.query).mockResolvedValue(tabs as any);
    await expect(fetchSafariAccounts(context)).rejects.toThrow('safariOpenSite');
    expect(browser.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('keeps login and server failures instead of reusing stale accounts', async () => {
    vi.mocked(browser.scripting.executeScript).mockResolvedValue([
      { result: { status: 401, data: null } },
    ] as any);
    await expect(new HandleManager().fetchAccounts(context)).rejects.toThrow('loginRequired');
    vi.mocked(browser.scripting.executeScript).mockResolvedValue([
      { result: { status: 500, data: null } },
    ] as any);
    await expect(new HandleManager().fetchAccounts(context)).rejects.toThrow('serverError_500');
  });

  it('rejects a missing script result', async () => {
    vi.mocked(browser.scripting.executeScript).mockResolvedValue([] as any);
    await expect(fetchSafariAccounts(context)).rejects.toThrow('networkError');
  });

  it('rechecks the origin inside the tab after navigation', async () => {
    vi.mocked(browser.scripting.executeScript).mockImplementation(async (details: any) => [
      { result: await details.func() },
    ] as any);
    // jsdom is on localhost, simulating navigation away from the selected IdP tab.
    await expect(fetchSafariAccounts(context)).rejects.toThrow('safariOpenSite');
  });
});
