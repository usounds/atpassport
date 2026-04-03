import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AtPassport } from '../core';

describe('AtPassport', () => {
  const baseUrl = 'https://passport.atproto.com';
  const callbackUrl = 'https://app.com/callback';

  beforeEach(() => {
    // Polyfill crypto.randomUUID for vitest environment
    if (typeof crypto === 'undefined' || typeof (crypto as (typeof crypto & { randomUUID: unknown })).randomUUID !== 'function') {
      const g = globalThis as unknown as { crypto: { randomUUID: () => string } };
      if (!g.crypto) g.crypto = { randomUUID: () => '' };
      g.crypto.randomUUID = () => 'test-uuid-1234';
    }

    // Mock window
    vi.stubGlobal('window', {
      screenX: 0,
      screenY: 0,
      outerWidth: 1024,
      outerHeight: 768,
      open: vi.fn().mockReturnValue({ closed: false }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('generates correct auth URL and state (no lang)', () => {
    const passport = new AtPassport({ baseUrl, callbackUrl });
    const { url, atpstate } = passport.generateAuthUrl({ theme: 'dark' });

    const parsed = new URL(url);
    expect(parsed.origin).toBe(baseUrl);
    expect(parsed.pathname).toBe('/authentication');
    expect(atpstate).toMatch(/^atpstate-/);
    expect(parsed.searchParams.get('atpstate')).toBe(atpstate);
    
    const innerCallback = new URL(parsed.searchParams.get('callback')!);
    expect(innerCallback.origin).toBe('https://app.com');
    expect(innerCallback.searchParams.get('theme')).toBe('dark');
  });

  it('generates correct auth URL with handle option', () => {
    const passport = new AtPassport({ baseUrl, callbackUrl });
    const { url } = passport.generateAuthUrl({}, { handle: 'alice.bsky.social' });

    const parsed = new URL(url);
    expect(parsed.searchParams.get('handle')).toBe('alice.bsky.social');
  });

  it('generates correct add URL', () => {
    const passport = new AtPassport({ baseUrl, callbackUrl, lang: 'ja' });
    const { url, atpstate } = passport.generateAddUrl('bob.bsky.social', { mode: 'fast' });

    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/ja/add');
    expect(parsed.searchParams.get('handle')).toBe('bob.bsky.social');
    expect(atpstate).toMatch(/^atpstate-/);
    
    const innerCallback = new URL(parsed.searchParams.get('callback')!);
    expect(innerCallback.searchParams.get('mode')).toBe('fast');
  });

  it('enforces requiredParams in generateAuthUrl', () => {
    const passport = new AtPassport({ 
      callbackUrl, 
      requiredParams: { apiKey: 'string', userId: 'string' } 
    });

    // @ts-expect-error - testing runtime validation
    expect(() => passport.generateAuthUrl({ apiKey: '123' }))
      .toThrow('Missing required custom parameters: userId');
    
    // Testing runtime validation for empty strings
    expect(() => passport.generateAuthUrl({ apiKey: '123', userId: ' ' } as unknown as Record<string, string>))
      .toThrow('Missing required custom parameters: userId');
  });

  it('parses callback URL correctly and validates requiredParams', () => {
    const passport = new AtPassport({ 
      callbackUrl,
      requiredParams: { session: 'id' }
    });
    const testUrl = 'https://app.com/callback?handle=alice.bsky.social&did=did:plc:123&pdsurl=https://pds.example.com&atpstate=test-state&session=abc';
    
    const result = passport.parseCallback(testUrl, 'test-state');
    expect(result.handle).toBe('alice.bsky.social');
    expect(result.customParams.session).toBe('abc');

    // Mismatched callback path
    const wrongPathUrl = 'https://app.com/wrong?handle=alice&atpstate=s';
    expect(() => passport.parseCallback(wrongPathUrl, 's'))
      .toThrow('Callback URL pathname mismatch');

    // Missing required param in callback
    const missingParamUrl = 'https://app.com/callback?handle=alice&atpstate=s';
    expect(() => passport.parseCallback(missingParamUrl, 's'))
      .toThrow('Missing required custom parameters: session');
  });

  it('throws on CSRF state mismatch', () => {
    const passport = new AtPassport({ callbackUrl });
    const testUrl = 'https://app.com/callback?handle=alice.bsky.social&atpstate=test-state';
    
    expect(() => passport.parseCallback(testUrl, 'wrong-state')).toThrow('Invalid atpstate: CSRF validation failed.');
  });
});
