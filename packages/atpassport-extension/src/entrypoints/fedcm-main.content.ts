import { installFedCmPolyfill } from '@/lib/installFedCmPolyfill';

export default defineContentScript({
  include: ['safari'],
  matches: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main: installFedCmPolyfill,
});
