import { decodeJwt, decodeProtectedHeader, base64url } from 'jose';
import { getAtprotoVerificationMaterial } from '@atcute/identity';
import { getPublicKeyFromDidController, verifySig } from '@atcute/crypto';
import { encodeUtf8 } from '@atcute/uint8array';
import { resolveDidDocument } from './atproto-server';
import type { AtprotoDid } from '@atcute/lexicons/syntax';

const MAX_TOKEN_TTL_SECONDS = 5 * 60;
const CLOCK_SKEW_SECONDS = 60;

/**
 * Parses and verifies the Service Auth JWT (Proxy JWT) from an atproto request.
 * 
 * Returns the originating user's DID (iss) if valid, or null otherwise.
 */
export async function verifyServiceAuth(request: Request, expectedLxm?: string): Promise<AtprotoDid | null> {
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
    const lxm = payload.lxm;


    if (!iss || typeof iss !== 'string' || !iss.startsWith('did:')) {
      console.warn('[verifyServiceAuth] Invalid issuer in JWT payload:', iss);
      return null;
    }

    // Step 2: Validate audience (Audience is usually our did:web:host)
    const host = request.headers.get('host') || 'atpassport.net';
    const expectedAud = `did:web:${host}`;
    
    if (aud !== expectedAud) {
      const allowedAuds = [expectedAud, `did:web:atpassport.net`, `did:web:dev.atpassport.net`];
      if (!allowedAuds.includes(aud as string)) {
        console.warn(`[verifyServiceAuth] Audience mismatch. Expected one of: ${allowedAuds.join(', ')}, Got: ${aud}`);
        return null;
      }
    }

    if (expectedLxm && lxm !== expectedLxm) {
      console.warn(`[verifyServiceAuth] Method mismatch. Expected: ${expectedLxm}, Got: ${lxm}`);
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      console.warn('[verifyServiceAuth] Missing or invalid expiration');
      return null;
    }

    if (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat)) {
      console.warn('[verifyServiceAuth] Missing or invalid issued-at time');
      return null;
    }

    if (payload.exp <= now - CLOCK_SKEW_SECONDS) {
      console.warn('[verifyServiceAuth] Token expired');
      return null;
    }

    if (payload.iat > now + CLOCK_SKEW_SECONDS) {
      console.warn('[verifyServiceAuth] Token issued in the future');
      return null;
    }

    if (payload.exp - payload.iat > MAX_TOKEN_TTL_SECONDS + CLOCK_SKEW_SECONDS) {
      console.warn('[verifyServiceAuth] Token TTL is too long');
      return null;
    }

    if (payload.nbf !== undefined) {
      if (typeof payload.nbf !== 'number' || !Number.isFinite(payload.nbf)) {
        console.warn('[verifyServiceAuth] Invalid not-before time');
        return null;
      }
      if (payload.nbf > now + CLOCK_SKEW_SECONDS) {
        console.warn('[verifyServiceAuth] Token is not active yet');
        return null;
      }
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

    const isValid = await verifySig(publicKey, signature, message, { allowMalleableSig: false });
    if (!isValid) {
       console.warn('[verifyServiceAuth] Invalid JWT signature');
       return null;
    }

    return iss as AtprotoDid;
  } catch (error) {
    console.error('[verifyServiceAuth] Failed to parse Service Auth JWT:', error);
    return null;
  }
}
