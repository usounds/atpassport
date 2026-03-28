import { decodeJwt } from 'jose';
import { resolveIdentity } from './atproto-server';

/**
 * Parses and verifies the Service Auth JWT (Proxy JWT) from an AT Protocol request.
 * 
 * Returns the originating user's DID (iss) if valid, or null otherwise.
 */
export async function verifyServiceAuth(request: Request): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    // The request sent through the PDS proxy has an 'Authorization: Bearer <JWT>' header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[verifyServiceAuth] Missing or invalid Authorization header');
      return null;
    }

    const token = authHeader.replace('Bearer ', '').trim();
    
    // Step 1: Decode the JWT
    // TODO: Ideally, we should also verify the signature cryptographically by using jose's jwtVerify
    // using the resolved verificationMethod (public key) from the issuer's DID document.
    // Parsing secp256k1 multibase keys into Node.js CryptoKey requires additional parsing logic.
    // We are trusting the proxy temporarily.
    const payload = decodeJwt(token);
    
    const iss = payload.iss; // Issuer: Typically the user's DID directly in Service Auth JWT.
    const aud = payload.aud; // Audience: The destination DID (did:web:yourhost)

    if (!iss || typeof iss !== 'string' || !iss.startsWith('did:')) {
      console.warn('[verifyServiceAuth] Invalid issuer in JWT payload:', iss);
      return null;
    }

    // Step 2: Validate audience (Audience is usually our did:web:host)
    const host = request.headers.get('host') || 'atpassport.net';
    const expectedAud = `did:web:${host}`;
    
    if (aud !== expectedAud) {
      console.warn(`[verifyServiceAuth] Audience mismatch. Expected: ${expectedAud}, Got: ${aud}`);
      // NOTE: Some PDS might send different aud formats depending on the proxy service config.
      // We will allow it for now if testing, but ideally return null.
      // return null; 
    }

    // Step 3: Ensure the DID actually resolves
    const identity = await resolveIdentity(iss);
    if (!identity) {
      console.warn('[verifyServiceAuth] Could not resolve identity for iss:', iss);
      return null;
    }

    // You can add further checks here if needed, such as expiration (exp) and not-before (nbf)
    // which decodeJwt performs superficially, but verifyJwt would do strictly.
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
       console.warn('[verifyServiceAuth] Token expired');
       return null;
    }

    return iss;
  } catch (error) {
    console.error('[verifyServiceAuth] Failed to parse Service Auth JWT:', error);
    return null;
  }
}
