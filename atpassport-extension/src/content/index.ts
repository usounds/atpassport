// Content script to auto-fill or interact with webpage DOM

chrome.runtime.onMessage.addListener((request: { action: string; handle: string }, sender, sendResponse) => {
  if (request.action === 'autoFillHandle') {
    const activeElement = document.activeElement;
    const handleValue = request.handle;

    // Try to fill active element if it's an input/textarea
    if (activeElement && (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
      activeElement.value = handleValue;
      
      // Dispatch events for React/Vue/Angular change detection
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      sendResponse({ success: true, method: 'injected' });
      return;
    }

    // fallback: look for handle input
    const handleInputs = document.querySelectorAll('input[name="handle"], input[placeholder*="handle"], input[type="text"]');
    if (handleInputs.length > 0) {
      const input = handleInputs[0] as HTMLInputElement;
      input.value = handleValue;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      sendResponse({ success: true, method: 'injected' });
      return;
    }

    // If no suitable input was found, we will reply failure (popup will handle clipboard)
    sendResponse({ success: false });
  }
});
