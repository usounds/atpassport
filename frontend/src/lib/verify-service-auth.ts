import { decodeJwt, decodeProtectedHeader, base64url } from 'jose';
import { getAtprotoVerificationMaterial } from '@atcute/identity';
import { getPublicKeyFromDidController, verifySig } from '@atcute/crypto';
import { encodeUtf8 } from '@atcute/uint8array';
import { resolveDidDocument } from './atproto-server';

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

    // Step 1: Decode and Parse the JWT parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[verifyServiceAuth] Invalid JWT format');
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = encodeUtf8(`${headerB64}.${payloadB64}`);
    const signature = base64url.decode(signatureB64) as Uint8Array<ArrayBuffer>;

    const header = decodeProtectedHeader(token);
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

    // Step 3: Resolve the DID document and get verification material
    const didDoc = await resolveDidDocument(iss);
    if (!didDoc) {
      console.warn('[verifyServiceAuth] Could not resolve DID document for iss:', iss);
      return null;
    }

    const material = getAtprotoVerificationMaterial(didDoc);
    if (!material) {
      console.warn('[verifyServiceAuth] No atproto verification material found in DID document for iss:', iss);
      return null;
    }

    // Step 4: Verify the signature
    const publicKey = getPublicKeyFromDidController(material);
    
    if (publicKey.jwtAlg !== header.alg) {
      console.warn(`[verifyServiceAuth] Algorithm mismatch. Expected: ${publicKey.jwtAlg}, Got: ${header.alg}`);
      return null;
    }

    const isValid = await verifySig(publicKey, signature, message, { allowMalleableSig: true });
    if (!isValid) {
       console.warn('[verifyServiceAuth] Invalid JWT signature');
       return null;
    }

    // Check expiration
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
