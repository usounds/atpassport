import { HandleManager } from '@/lib/HandleManager';
import { setupFedCmHeaderRule } from '@/lib/fedcmHeaderRule';

export default defineBackground(() => {
  // Initialize declarativeNetRequest rule for Firefox FedCM polyfill
  setupFedCmHeaderRule().catch((err) => {
    console.error('[AtPassport] Failed to setup FedCM header rule:', err);
  });

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
