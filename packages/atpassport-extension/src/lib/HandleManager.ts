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
    } catch (error: any) {
      if (error.message === 'Failed to fetch') {
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
            input.value = handleValue;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          };

          if (activeElement && (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
            fill(activeElement as HTMLInputElement);
            return { success: true };
          }

          const handleInputs = document.querySelectorAll('input[name="handle"], input[placeholder*="handle"], input[type="text"]');
          if (handleInputs.length > 0) {
            fill(handleInputs[0] as HTMLInputElement);
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
    } catch (err) {
      await navigator.clipboard.writeText(handle);
      return 'copiedIncompatible';
    }
  }
}
