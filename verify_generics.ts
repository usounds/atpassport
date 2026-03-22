import { AtPassport } from './packages/atpassport-client/src/core';

// Case 1: No required params
const atp1 = new AtPassport({
  callbackUrl: 'http://localhost:3000/callback'
});
atp1.generateAuthUrl(); // Should be OK (optional)
atp1.generateAuthUrl({ foo: 'bar' }); // Should be OK

// Case 2: With required params object (inference happens here)
const atp2 = new AtPassport({
  callbackUrl: 'http://localhost:3000/callback',
  requiredParams: {
    returnTo: 'string', // The value doesn't matter, just the key
  }
});

// @ts-expect-error: Missing required 'returnTo'
atp2.generateAuthUrl({}); 

// @ts-expect-error: Missing required 'returnTo'
atp2.generateAuthUrl({ theme: 'dark' });

// Should be OK
atp2.generateAuthUrl({ returnTo: '/dashboard' });

// Should be OK with extra params
atp2.generateAuthUrl({ returnTo: '/dashboard', theme: 'dark' });

console.log('Inference-based verification script created successfully.');
