import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AtPassport } from '../index';

describe('AtPassport', () => {
  const baseUrl = 'https://passport.atproto.com';
  const callbackUrl = 'https://app.com/callback';

  beforeEach(async () => {
    // Polyfill crypto.randomUUID for vitest environment if needed
    if (typeof crypto === 'undefined' || typeof (crypto as any).randomUUID !== 'function') {
      const g = global as any;
      if (!g.crypto) g.crypto = {};
      g.crypto.randomUUID = () => 'test-uuid-1234';
    }
  });

  it('generates correct auth URL and state (no lang)', () => {
    const passport = new AtPassport({ baseUrl, callbackUrl });
    const { url, atpstate } = passport.generateAuthUrl({ theme: 'dark' });

    const parsed = new URL(url);
    expect(parsed.origin).toBe(baseUrl);
    expect(parsed.pathname).toBe('/authentication');
    expect(parsed.searchParams.get('atpstate')).toBe(atpstate);
    
    const innerCallback = new URL(parsed.searchParams.get('callback')!);
    expect(innerCallback.origin).toBe('https://app.com');
    expect(innerCallback.searchParams.get('theme')).toBe('dark');
  });

  it('generates correct auth URL with lang', () => {
    const passport = new AtPassport({ baseUrl, callbackUrl, lang: 'ja' });
    const { url } = passport.generateAuthUrl();

    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/ja/authentication');
  });

  it('parses callback URL correctly', () => {
    const passport = new AtPassport({ callbackUrl });
    const testUrl = 'https://app.com/callback?handle=alice.bsky.social&did=did:plc:123&pdsurl=https://pds.example.com&atpstate=test-state&extra=param';
    
    const result = passport.parseCallback(testUrl, 'test-state');
    expect(result.handle).toBe('alice.bsky.social');
    expect(result.did).toBe('did:plc:123');
    expect(result.pdsUrl).toBe('https://pds.example.com');
    expect(result.atpstate).toBe('test-state');
    expect(result.customParams.extra).toBe('param');
    expect(result.customParams.handle).toBeUndefined();
  });

  it('throws on CSRF state mismatch', () => {
    const passport = new AtPassport({ callbackUrl });
    const testUrl = 'https://app.com/callback?handle=alice.bsky.social&atpstate=test-state';
    
    expect(() => passport.parseCallback(testUrl, 'wrong-state')).toThrow('Invalid atpstate: CSRF validation failed.');
  });
});
