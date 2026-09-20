import { HandleManager } from '@/lib/HandleManager';

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    // AtPassport Extension installed.
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'FETCH_ACCOUNTS') {
      const manager = new HandleManager();
      manager
        .fetchAccounts()
        .then((accounts) => {
          sendResponse({ success: true, accounts });
        })
        .catch((err) => {
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      return true; // Keep message channel open for async response
    }
  });
});
