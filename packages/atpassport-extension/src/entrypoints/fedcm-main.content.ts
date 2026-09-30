import { installFedCmPolyfill } from '@/lib/installFedCmPolyfill';

export default defineContentScript({
  include: ['safari'],
  matches: ['<all_urls>', 'http://localhost/*', 'http://127.0.0.1/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    console.log('[@passport] Safari MAIN world content script loaded on:', window.location.href);
    installFedCmPolyfill();
  },
});
