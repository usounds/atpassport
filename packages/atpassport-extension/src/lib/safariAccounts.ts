export interface AccountTabContext {
  windowId: number;
  incognito: boolean;
}

/** Fetch in the site's own context, without exporting session cookies. */
export async function fetchSafariAccounts(context?: AccountTabContext) {
  // A popup resolves its active window; background callers must supply the sender's window.
  if (!context) {
    const [active] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!active || typeof active.windowId !== 'number') throw new Error('safariOpenSite');
    context = { windowId: active.windowId, incognito: Boolean(active.incognito) };
  }
  const tabs = await browser.tabs.query({
    windowId: context.windowId,
    url: 'https://atpassport.net/*',
  });
  const tab = tabs.find(tab => tab.id !== undefined && tab.windowId === context.windowId &&
    Boolean(tab.incognito) === context.incognito &&
    tab.url?.startsWith('https://atpassport.net/'));
  if (tab?.id === undefined) throw new Error('safariOpenSite');

  const results = await browser.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [0] },
    world: 'ISOLATED',
    func: async () => {
      // The tab may have navigated since it was selected.
      if (location.origin !== 'https://atpassport.net') return { error: 'safariOpenSite' };
      try {
        const response = await fetch('https://atpassport.net/api/user/handles', {
          credentials: 'include', cache: 'no-store', redirect: 'error',
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) return { status: response.status, data: null };
        try {
          return { status: response.status, data: await response.json() as unknown };
        } catch {
          return { error: 'invalidResponse' };
        }
      } catch {
        return { error: 'networkError' };
      }
    },
  });
  const result = results?.[0]?.result;
  if (!result) throw new Error('networkError');
  if (result.error) throw new Error(result.error);
  return {
    ok: result.status !== undefined && result.status >= 200 && result.status < 300,
    status: result.status,
    json: async () => result.data,
  };
}
