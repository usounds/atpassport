import { installFedCmPolyfill } from '@/lib/installFedCmPolyfill';

export default defineUnlistedScript({
  include: ['firefox'],
  main: installFedCmPolyfill,
});
