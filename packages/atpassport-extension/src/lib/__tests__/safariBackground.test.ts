/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  clearSafariCache: vi.fn().mockResolvedValue(undefined),
  getSafariCachedAccounts: vi.fn().mockResolvedValue([{ handle: 'alice.test' }]),
  recordSafariMutation: vi.fn().mockResolvedValue(undefined),
  serializeSafariTask: (task: () => Promise<unknown>) => task(),
}));
vi.mock('../safariAccountCache', () => service);

describe('Safari background routing', () => {
  let api: any;
  let onMessage: any;
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv('BROWSER', 'safari');
    const event = () => ({ addListener: vi.fn() });
    api = {
      storage: { session: { setAccessLevel: vi.fn().mockResolvedValue(undefined) } },
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 8, windowId: 4, incognito: false }]),
        get: vi.fn().mockResolvedValue({ id: 7, windowId: 3, url: 'https://atpassport.net/en', incognito: false }),
        create: vi.fn().mockResolvedValue({ id: 9, windowId: 4 }),
      },
      windows: { onRemoved: event() },
      webRequest: { onBeforeRequest: event(), onCompleted: event(), onErrorOccurred: event() },
      runtime: { onMessage: event(), getURL: (path: string) => `safari-web-extension://test${path}` },
    };
    vi.stubGlobal('browser', api);
    vi.stubGlobal('defineBackground', (main: () => void) => main);
    const background = await import('../../entrypoints/background');
    (background.default as unknown as () => void)();
    onMessage = api.runtime.onMessage.addListener.mock.calls[0][0];
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  const request = (type: string, sender: any) => new Promise<any>(resolve => {
    expect(onMessage({ type, windowId: 999 }, sender, resolve)).toBe(true);
  });

  it('resolves popup context in the background, ignoring a supplied window ID', async () => {
    expect(await request('FETCH_ACCOUNTS', { url: 'safari-web-extension://test/popup.html' })).toMatchObject({ success: true });
    expect(service.getSafariCachedAccounts).toHaveBeenCalledWith({ windowId: 4, incognito: false }, false);
    expect(api.storage.session.setAccessLevel).toHaveBeenCalledWith({ accessLevel: 'TRUSTED_CONTEXTS' });
  });

  it('accepts refresh requests only from the actual top-level IdP tab', async () => {
    expect(await request('SYNC_SAFARI_ACCOUNTS', {
      frameId: 0, url: 'https://rp.example/', tab: { windowId: 3 },
    })).toMatchObject({ success: false });
    expect(service.getSafariCachedAccounts).not.toHaveBeenCalled();
    expect(await request('SYNC_SAFARI_ACCOUNTS', {
      frameId: 0, url: 'https://atpassport.net/en', tab: { windowId: 3, incognito: true },
    })).toMatchObject({ success: true });
    expect(service.getSafariCachedAccounts).toHaveBeenCalledWith({ windowId: 3, incognito: true }, true);
  });

  it('invalidates before mutations and refreshes after completion, ignoring account GETs', async () => {
    const before = api.webRequest.onBeforeRequest.addListener.mock.calls[0][0];
    const completed = api.webRequest.onCompleted.addListener.mock.calls[0][0];
    before({ method: 'GET', requestId: 'read' });
    expect(service.recordSafariMutation).not.toHaveBeenCalled();
    before({ method: 'POST', requestId: 'write' });
    await vi.waitFor(() => expect(service.recordSafariMutation).toHaveBeenCalledWith('write', true));
    completed({ method: 'POST', requestId: 'write', tabId: 7 });
    await vi.waitFor(() => expect(service.getSafariCachedAccounts).toHaveBeenCalledWith({ windowId: 3, incognito: false }, true));
    expect(service.recordSafariMutation).toHaveBeenCalledWith('write', false);
    expect(api.webRequest.onBeforeRequest.addListener.mock.calls[0][1]).toEqual({ urls: ['https://atpassport.net/*'] });
  });

  it('opens AtPassport once when missing in window, but skips when already open', async () => {
    // When no tab exists with atpassport.net URL in window 4:
    api.tabs.query.mockResolvedValueOnce([{ id: 1, windowId: 4, url: 'https://rp.example/' }]);
    const res1 = await request('OPEN_AT_PASSPORT_ONCE', { tab: { windowId: 4 } });
    expect(res1).toEqual({ success: true, opened: true, tabId: 9 });
    expect(api.tabs.create).toHaveBeenCalledWith({
      url: 'https://atpassport.net',
      windowId: 4,
      active: true,
    });

    // When an atpassport.net tab already exists in window 4:
    api.tabs.create.mockClear();
    api.tabs.query.mockResolvedValueOnce([{ id: 10, windowId: 4, url: 'https://atpassport.net/ja' }]);
    const res2 = await request('OPEN_AT_PASSPORT_ONCE', { tab: { windowId: 4 } });
    expect(res2).toEqual({ success: true, opened: false, tabId: 10 });
    expect(api.tabs.create).not.toHaveBeenCalled();
  });

  it('retrieves accounts via browser.cookies.get and Bearer token without tabs', async () => {
    api.cookies = {
      get: vi.fn().mockResolvedValue({ value: 'test-jwt-cookie-value' }),
    };
    const { HandleManager: FreshHandleManager } = await import('../HandleManager');
    const fetchSpy = vi.spyOn(FreshHandleManager.prototype, 'fetchAccounts')
      .mockResolvedValueOnce([{ handle: 'bob.test' }]);

    const response = await request('FETCH_ACCOUNTS', { tab: { windowId: 4 } });
    expect(response).toEqual({ success: true, accounts: [{ handle: 'bob.test' }] });
    expect(api.cookies.get).toHaveBeenCalledWith({
      url: 'https://atpassport.net',
      name: '__Host-atpassport_session_v2',
    });
    expect(fetchSpy).toHaveBeenCalledWith(undefined, 'test-jwt-cookie-value');
    expect(service.getSafariCachedAccounts).not.toHaveBeenCalled();
  });
});
