import { setupFedCmHeaderRule } from '@/lib/fedcmHeaderRule';
import { handleBackgroundMessage } from '@/lib/backgroundMessages';

export default defineBackground(() => {
  // Initialize declarativeNetRequest rule for Firefox FedCM polyfill
  setupFedCmHeaderRule().catch((err) => {
    console.error('[AtPassport] Failed to setup FedCM header rule:', err);
  });

  chrome.runtime.onInstalled.addListener(() => {
    // AtPassport Extension installed.
  });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleBackgroundMessage(message, sender)
      .then(sendResponse)
      .catch((err) => {
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    return true; // Keep message channel open for async response
  });
});

