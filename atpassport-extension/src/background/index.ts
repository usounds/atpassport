// Background service worker for AtPassport extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('AtPassport Extension installed.');
});

// Future: Handle messages from popup or content scripts, 
// if more complex logic like cross-origin storage or state management is needed.
