export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    // AtPassport Extension installed.
  });
});
