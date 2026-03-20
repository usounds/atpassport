import { describe, it, expect, beforeEach } from 'vitest';
import { AtPassport } from '../index';
import { generateKeyPair, SignJWT, exportPKCS8, exportSPKI } from 'jose';

describe('AtPassport', () => {
  const baseUrl = 'https://passport.atproto.com';
  let privateKey: string;
  let publicKey: string;

  beforeEach(async () => {
    const keyPair = await generateKeyPair('RS256');
    privateKey = await exportPKCS8(keyPair.privateKey);
    publicKey = await exportSPKI(keyPair.publicKey);
  });

  it('generates correct register URL', () => {
    const passport = new AtPassport(baseUrl);
    const url = passport.registerUrl('alice.bsky.social', 'https://app.com/callback');
    
    const parsed = new URL(url);
    expect(parsed.origin).toBe(baseUrl);
    expect(parsed.pathname).toBe('/api/register');
    expect(parsed.searchParams.get('handle')).toBe('alice.bsky.social');
    expect(parsed.searchParams.get('callbackUrl')).toBe('https://app.com/callback');
  });

  it('generates correct resolve URL', () => {
    const passport = new AtPassport(baseUrl);
    const url = passport.resolveUrl('https://app.com/callback');
    
    const parsed = new URL(url);
    expect(parsed.origin).toBe(baseUrl);
    expect(parsed.pathname).toBe('/api/resolve');
    expect(parsed.searchParams.get('callbackUrl')).toBe('https://app.com/callback');
  });

  it('gets session from a valid token', async () => {
    const passport = new AtPassport(baseUrl, publicKey);
    
    const payload = { did: 'did:plc:123', handle: 'alice.bsky.social', uuid: 'uuid-123' };
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .setIssuer('atpassport')
      .sign(await importPKCS8(privateKey, 'RS256'));

    const verified = await passport.get(token);
    expect(verified.did).toBe(payload.did);
    expect(verified.handle).toBe(payload.handle);
    expect(verified.uuid).toBe(payload.uuid);
  });
});

async function importPKCS8(pkcs8: string, alg: string) {
  const { importPKCS8 } = await import('jose');
  return await importPKCS8(pkcs8, alg);
}
