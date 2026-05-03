/**
 * Handles the core logic for fetching and applying handles in the extension.
 */
export class HandleManager {
  private apiEndpoint = 'https://atpassport.net/api/user/handles';

  /**
   * Fetches handles from the AtPassport API.
   */
  async fetchHandles(): Promise<string[]> {
    try {
      const response = await fetch(this.apiEndpoint, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('loginRequired');
        }
        throw new Error(`fetchError_${response.status}`);
      }

      const data = await response.json();
      return data.handles || [];
    } catch (error) {
      if (error instanceof Error && error.message === 'Failed to fetch') {
        throw new Error('fetchError');
      }
      throw error;
    }
  }

  /**
   * Fills the handle into the active tab's input field or copies to clipboard.
   * @returns The status key for localization.
   */
  async applyHandle(handle: string): Promise<string> {
    try {
      // Use browser namespace for better cross-browser compatibility, especially in Firefox
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active tab');
      }

      const results = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (handleValue: string) => {
          const fill = (input: HTMLInputElement | HTMLTextAreaElement) => {
            // Dispatch focus event
            input.focus();

            // Use native value setter to bypass React's tracking
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value"
            )?.set || Object.getOwnPropertyDescriptor(
              window.HTMLTextAreaElement.prototype,
              "value"
            )?.set;
            
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(input, handleValue);
            } else {
              input.value = handleValue;
            }

            // Dispatch events for framework compatibility
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.dispatchEvent(new Event('blur', { bubbles: true }));
          };

          // 1. Try common handle-related selectors first
          const selectors = [
            'input[name="handle"]',
            'input[id="handle"]',
            'input[placeholder*="handle" i]',
            'input[placeholder*="ハンドル" i]', // Japanese support
            'input[autocomplete="username"]',
            'input[type="text"]'
          ];

          for (const selector of selectors) {
            const input = document.querySelector(selector);
            if (input && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
              fill(input);
              return { success: true };
            }
          }

          // 2. Fallback to active element if still relevant
          const activeElement = document.activeElement;
          if (activeElement && (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
            fill(activeElement);
            return { success: true };
          }

          return { success: false };
        },
        args: [handle],
      });

      const response = results && results[0] && (results[0].result as { success: boolean });

      if (response && response.success) {
        return 'filledSuccess';
      } else {
        await navigator.clipboard.writeText(handle);
        return 'copiedFallback';
      }
    } catch (e) {
      console.error('[HandleManager] applyHandle error:', e);
      await navigator.clipboard.writeText(handle);
      return 'copiedIncompatible';
    }
  }
}
