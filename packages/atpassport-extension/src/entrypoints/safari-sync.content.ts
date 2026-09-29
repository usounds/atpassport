export default defineContentScript({
  include: ['safari'],
  matches: ['https://atpassport.net/*'],
  runAt: 'document_idle',
  main(ctx) {
    let lastSync = 0;
    const sync = () => {
      if (Date.now() - lastSync < 10000) return;
      lastSync = Date.now();
      // Background fetches from this trusted tab itself; page events cannot
      // provide account data or choose another window's cache key.
      void browser.runtime.sendMessage({ type: 'SYNC_SAFARI_ACCOUNTS' }).catch(() => {});
    };
    sync();
    ctx.addEventListener(window, 'pageshow', sync);
    ctx.addEventListener(window, 'focus', sync);
    ctx.addEventListener(document, 'visibilitychange', () => {
      if (document.visibilityState === 'visible') sync();
    });
  },
});
