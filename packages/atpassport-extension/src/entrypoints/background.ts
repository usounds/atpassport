import { HandleManager } from '@/lib/HandleManager';
import { clearSafariCache, getSafariCachedAccounts, recordSafariMutation, serializeSafariTask } from '@/lib/safariAccountCache';

export default defineBackground(() => {
  if (import.meta.env.BROWSER === 'safari') {
    const ready = browser.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
    const run = <T>(task: () => Promise<T>) => serializeSafariTask(async () => {
      await ready;
      return task();
    });
    const refreshTab = async (tabId: number) => {
      if (tabId < 0) return;
      const tab = await browser.tabs.get(tabId);
      if (!tab.url?.startsWith('https://atpassport.net/') || typeof tab.windowId !== 'number') return;
      await getSafariCachedAccounts({ windowId: tab.windowId, incognito: Boolean(tab.incognito) }, true);
    };
    const isMutation = (details: { method: string }) => !['GET', 'HEAD', 'OPTIONS'].includes(details.method);
    const filter = { urls: ['https://atpassport.net/*'] };
    browser.webRequest.onBeforeRequest.addListener(details => {
      if (isMutation(details)) void run(() => recordSafariMutation(details.requestId, true)).catch(console.error);
    }, filter);
    browser.webRequest.onCompleted.addListener(details => {
      if (isMutation(details)) void run(async () => {
        await recordSafariMutation(details.requestId, false);
        await refreshTab(details.tabId);
      }).catch(() => {});
    }, filter);
    browser.webRequest.onErrorOccurred.addListener(details => {
      if (isMutation(details)) void run(() => recordSafariMutation(details.requestId, false)).catch(console.error);
    }, filter);
    browser.windows.onRemoved.addListener(windowId => {
      void run(() => clearSafariCache(windowId)).catch(console.error);
    });

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message?.type === 'OPEN_AT_PASSPORT_ONCE') {
        void run(async () => {
          let windowId = sender.tab?.windowId;
          if (typeof windowId !== 'number') {
            const [active] = await browser.tabs.query({ active: true, currentWindow: true });
            windowId = active?.windowId;
          }
          const tabs = await browser.tabs.query({
            url: 'https://atpassport.net/*',
            ...(typeof windowId === 'number' ? { windowId } : {}),
          });
          const existing = tabs.find(tab =>
            (typeof windowId !== 'number' || tab.windowId === windowId) &&
            tab.url?.startsWith('https://atpassport.net/')
          );
          if (!existing) {
            const created = await browser.tabs.create({
              url: 'https://atpassport.net',
              ...(typeof windowId === 'number' ? { windowId } : {}),
              active: true,
            });
            return { opened: true, tabId: created.id };
          }
          return { opened: false, tabId: existing.id };
        }).then(result => sendResponse({ success: true, ...result }))
          .catch(error => sendResponse({ success: false, error: String(error) }));
        return true;
      }

      if (!['FETCH_ACCOUNTS', 'SYNC_SAFARI_ACCOUNTS'].includes(message?.type)) return;
      void run(async () => {
        const isPopup = !sender.tab && sender.url === browser.runtime.getURL('/popup.html');
        const isSite = sender.frameId === 0 && sender.url?.startsWith('https://atpassport.net/');
        if (message.type === 'SYNC_SAFARI_ACCOUNTS' && !isSite) throw new Error('Invalid sender');

        if (message.type === 'FETCH_ACCOUNTS') {
          try {
            const cookie = (await browser.cookies?.get({
              url: 'https://atpassport.net',
              name: '__Host-atpassport_session_v2',
            })) || (await browser.cookies?.get({
              url: 'https://atpassport.net',
              name: 'atpassport_session_v2',
            }));
            if (cookie?.value) {
              try {
                return await new HandleManager().fetchAccounts(undefined, cookie.value);
              } catch (fetchErr) {
                console.warn('[Safari Background] Bearer fetch failed (server may not be deployed yet), falling back to tab transport:', fetchErr);
              }
            }
          } catch (cookieErr) {
            console.warn('[Safari Background] browser.cookies.get failed:', cookieErr);
          }
        }

        let tab = sender.tab;
        if (!tab && isPopup) [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab || typeof tab.windowId !== 'number') throw new Error('safariOpenSite');
        return getSafariCachedAccounts({ windowId: tab.windowId, incognito: Boolean(tab.incognito) },
          message.type === 'SYNC_SAFARI_ACCOUNTS');
      }).then(accounts => sendResponse({ success: true, accounts }))
        .catch(error => sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) }));
      return true;
    });
    return;
  }

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'OPEN_AT_PASSPORT_ONCE') {
      browser.tabs.create({ url: 'https://atpassport.net' })
        .then(tab => sendResponse({ success: true, opened: true, tabId: tab.id }))
        .catch(error => sendResponse({ success: false, error: String(error) }));
      return true;
    }
    if (message?.type === 'FETCH_ACCOUNTS') {
      new HandleManager().fetchAccounts()
        .then(accounts => sendResponse({ success: true, accounts }))
        .catch(error => sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) }));
      return true;
    }
  });
});
