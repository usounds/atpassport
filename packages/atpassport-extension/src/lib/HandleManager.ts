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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        throw new Error('No active tab');
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (handleValue: string) => {
          const activeElement = document.activeElement;
          
          const fill = (input: HTMLInputElement | HTMLTextAreaElement) => {
            // Use native value setter to bypass React's tracking if possible
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              "value"
            )?.set;
            
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(input, handleValue);
            } else {
              input.value = handleValue;
            }

            // Dispatch both input and change events for framework compatibility
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          };

          // 1. Try active element first (most reliable if user is already interacting)
          if (activeElement && (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
            fill(activeElement as HTMLInputElement);
            return { success: true };
          }

          // 2. Prioritized search for handle fields
          const selectors = [
            'input[name="handle"]',
            'input[id="handle"]',
            'input[placeholder*="handle" i]',
            'input[autocomplete="username"]',
            'input[type="text"]'
          ];

          for (const selector of selectors) {
            const input = document.querySelector(selector);
            if (input && (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) {
              fill(input as HTMLInputElement);
              return { success: true };
            }
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
    } catch {
      await navigator.clipboard.writeText(handle);
      return 'copiedIncompatible';
    }
  }
}
