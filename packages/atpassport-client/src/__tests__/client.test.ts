import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  AtPassport,
  fillInputValue,
  isHandleAssistSupported,
  parseHandleAssistToken,
  requestHandleAssist,
} from '../index';

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
      location: { origin: 'https://app.com' },
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

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (array: Uint8Array) => {
        array.set([
          0x00, 0x11, 0x22, 0x33,
          0x44, 0x55,
          0x66, 0x77,
          0x88, 0x99,
          0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff,
        ]);
        return array;
      },
    });

    const passport = new AtPassport({ baseUrl, callbackUrl });
    const { url, atpstate } = passport.generateAuthUrl();

    expect(atpstate).toBe('atpstate-00112233-4455-4677-8899-aabbccddeeff');
    expect(new URL(url).searchParams.get('atpstate')).toBe(atpstate);
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

    // Testing runtime validation
    expect(() => passport.generateAuthUrl({ apiKey: '123' }))
      .toThrow('Missing required custom parameters: userId');
    
    // Testing runtime validation for empty strings
    expect(() => passport.generateAuthUrl({ apiKey: '123', userId: ' ' }))
      .toThrow('Missing required custom parameters: userId');
  });

  it('rejects reserved callback parameters in customParams', () => {
    const passport = new AtPassport({ baseUrl, callbackUrl });

    expect(() => passport.generateAuthUrl({ handle: 'alice.bsky.social' }))
      .toThrow('Reserved callback parameters cannot be used in customParams: handle');

    expect(() => passport.generateAddUrl('alice.bsky.social', { did: 'did:plc:123' }))
      .toThrow('Reserved callback parameters cannot be used in customParams: did');
  });

  it('rejects reserved callback parameters in requiredParams', () => {
    expect(() => new AtPassport({
      callbackUrl,
      requiredParams: { handle: 'string' },
    })).toThrow('Reserved callback parameters cannot be used in requiredParams: handle');
  });

  it('parses callback URL correctly and validates requiredParams', () => {
    const passport = new AtPassport({ 
      callbackUrl,
      requiredParams: { session: 'id' }
    });
    const testUrl = 'https://app.com/callback?handle=alice.bsky.social&did=did:plc:123&pdsurl=https://pds.example.com&atpstate=test-state&session=abc';
    
    const result = passport.parseCallback(testUrl, 'test-state');
    expect(result.username).toBe('alice.bsky.social');
    expect(result.handle).toBe('alice.bsky.social');
    expect(result.customParams.session).toBe('abc');

    // Mismatched callback path
    const wrongPathUrl = 'https://app.com/wrong?handle=alice&atpstate=s';
    expect(() => passport.parseCallback(wrongPathUrl, 's'))
      .toThrow('Callback URL pathname mismatch');

    const wrongOriginUrl = 'https://evil.com/callback?handle=alice&atpstate=s';
    expect(() => passport.parseCallback(wrongOriginUrl, 's'))
      .toThrow('Callback URL origin mismatch');

    // Missing required param in callback
    const missingParamUrl = 'https://app.com/callback?handle=alice&atpstate=s';
    expect(() => passport.parseCallback(missingParamUrl, 's'))
      .toThrow('Missing required custom parameters: session');
  });

  it.each(['username=alice.bsky.social', 'username=alice.bsky.social&handle=old.example'])('returns handle as a username alias for %s', (params) => {
    const passport = new AtPassport({ callbackUrl });
    const result = passport.parseCallback(`${callbackUrl}?${params}&atpstate=s`, 's');
    expect(result.handle).toBe('alice.bsky.social');
    expect(result.username).toBe(result.handle);
    expect(result.customParams).toEqual({});
  });

  it('throws on CSRF state mismatch', () => {
    const passport = new AtPassport({ callbackUrl });
    const testUrl = 'https://app.com/callback?handle=alice.bsky.social&atpstate=test-state';
    
    expect(() => passport.parseCallback(testUrl, 'wrong-state')).toThrow('Invalid atpstate: CSRF validation failed.');
  });

  it('throws on missing atpstate', () => {
    const passport = new AtPassport({ callbackUrl });
    const testUrl = 'https://app.com/callback?handle=alice.bsky.social';
    
    expect(() => passport.parseCallback(testUrl)).toThrow('Missing atpstate: CSRF token is required.');
  });

  describe('FedCM handle assist', () => {
    const validToken = JSON.stringify({
      v: 1,
      did: 'did:plc:123',
      username: 'Alice.Bsky.Social',
    });

    it('parses and normalizes a valid handle assist token', () => {
      expect(parseHandleAssistToken(validToken)).toEqual({
        did: 'did:plc:123',
        username: 'alice.bsky.social',
        token: validToken,
      });
    });

    it.each([
      '',
      'not-json',
      JSON.stringify({ v: 2, did: 'did:plc:123', username: 'alice.bsky.social' }),
      JSON.stringify({ v: 1, did: 'not-a-did', username: 'alice.bsky.social' }),
      JSON.stringify({ v: 1, did: 'did:plc:123', username: 'not a handle' }),
    ])('rejects an invalid handle assist token', (token) => {
      expect(() => parseHandleAssistToken(token)).toThrow('Invalid @passport handle assist token.');
    });

    it('updates a native input and dispatches bubbling events', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      const inputListener = vi.fn();
      const changeListener = vi.fn();
      input.addEventListener('input', inputListener);
      input.addEventListener('change', changeListener);

      fillInputValue(input, 'alice.bsky.social');

      expect(input.value).toBe('alice.bsky.social');
      expect(inputListener).toHaveBeenCalledOnce();
      expect(changeListener).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(input);
      input.remove();
    });

    it('reports whether FedCM handle assist is available', () => {
      expect(isHandleAssistSupported()).toBe(false);

      vi.stubGlobal('window', {
        IdentityCredential: class {},
        location: { origin: 'https://app.com' },
      });
      vi.stubGlobal('navigator', { credentials: { get: vi.fn() } });

      expect(isHandleAssistSupported()).toBe(true);
    });

    it('treats a Permissions Policy rejection as unsupported', () => {
      vi.stubGlobal('window', {
        IdentityCredential: class {},
        location: { origin: 'https://app.com' },
      });
      vi.stubGlobal('navigator', { credentials: { get: vi.fn() } });
      Object.defineProperty(document, 'permissionsPolicy', {
        configurable: true,
        value: { allowsFeature: vi.fn().mockReturnValue(false) },
      });

      expect(isHandleAssistSupported()).toBe(false);
      Reflect.deleteProperty(document, 'permissionsPolicy');
    });

    it('uses the explicit fallback when FedCM is unavailable', async () => {
      const fallback = vi.fn().mockResolvedValue(null);
      await expect(requestHandleAssist({ fallback })).resolves.toBeNull();
      expect(fallback).toHaveBeenCalledOnce();
    });

    it('requests an active FedCM credential and fills the target input', async () => {
      const get = vi.fn().mockResolvedValue({ token: validToken });
      vi.stubGlobal('window', {
        IdentityCredential: class {},
        location: { origin: 'https://app.com' },
      });
      vi.stubGlobal('navigator', { credentials: { get } });
      const input = document.createElement('input');

      await expect(requestHandleAssist({ targetInput: input })).resolves.toMatchObject({
        did: 'did:plc:123',
        username: 'alice.bsky.social',
      });
      expect(input.value).toBe('alice.bsky.social');
      expect(get).toHaveBeenCalledWith(expect.objectContaining({
        identity: expect.objectContaining({
          mode: 'active',
          providers: [expect.objectContaining({ fields: ['username', 'picture'] })],
        }),
      }));
    });

    it('configures FedCM through the AtPassport client instance', async () => {
      const get = vi.fn().mockResolvedValue({ token: validToken });
      vi.stubGlobal('window', {
        IdentityCredential: class {},
        location: { origin: 'https://app.com' },
      });
      vi.stubGlobal('navigator', { credentials: { get } });
      const passport = new AtPassport({
        baseUrl,
        callbackUrl,
        fedcm: { clientId: 'https://client.example' },
      });

      expect(passport.isHandleAssistSupported()).toBe(true);
      await expect(passport.requestHandleAssist()).resolves.toMatchObject({
        username: 'alice.bsky.social',
      });
      expect(get).toHaveBeenCalledWith(expect.objectContaining({
        identity: expect.objectContaining({
          providers: [expect.objectContaining({
            configURL: `${baseUrl}/fedcm/config.json`,
            clientId: 'https://client.example',
          })],
        }),
      }));
    });

    it('keeps instance handle assist disabled unless fedcm is configured', async () => {
      const passport = new AtPassport({ baseUrl, callbackUrl });
      expect(passport.isHandleAssistSupported()).toBe(false);
      await expect(passport.requestHandleAssist()).resolves.toBeNull();
    });

    it('does not open a fallback or alter the input after user dismissal', async () => {
      const dismissal = new DOMException('Dismissed', 'AbortError');
      const get = vi.fn().mockRejectedValue(dismissal);
      const fallback = vi.fn();
      const onError = vi.fn();
      vi.stubGlobal('window', {
        IdentityCredential: class {},
        location: { origin: 'https://app.com' },
      });
      vi.stubGlobal('navigator', { credentials: { get } });
      const input = document.createElement('input');
      input.value = 'unchanged.example';

      await expect(requestHandleAssist({ targetInput: input, fallback, onError })).resolves.toBeNull();
      expect(input.value).toBe('unchanged.example');
      expect(fallback).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(dismissal);
    });

    it('uses the explicit fallback when the active mode is unsupported', async () => {
      const get = vi.fn().mockRejectedValue(new DOMException('Unsupported', 'NotSupportedError'));
      const fallbackResult = {
        did: 'did:plc:fallback',
        username: 'fallback.example',
        token: JSON.stringify({ v: 1, did: 'did:plc:fallback', username: 'fallback.example' }),
      };
      const fallback = vi.fn().mockResolvedValue(fallbackResult);
      vi.stubGlobal('window', {
        IdentityCredential: class {},
        location: { origin: 'https://app.com' },
      });
      vi.stubGlobal('navigator', { credentials: { get } });

      await expect(requestHandleAssist({ fallback })).resolves.toEqual(fallbackResult);
      expect(fallback).toHaveBeenCalledOnce();
    });

    it('uses the explicit fallback on IdentityCredentialError', async () => {
      const get = vi.fn().mockRejectedValue(new DOMException('Failed', 'IdentityCredentialError'));
      const fallbackResult = {
        did: 'did:plc:fallback',
        username: 'fallback.example',
        token: JSON.stringify({ v: 1, did: 'did:plc:fallback', username: 'fallback.example' }),
      };
      const fallback = vi.fn().mockResolvedValue(fallbackResult);
      vi.stubGlobal('window', {
        IdentityCredential: class {},
        location: { origin: 'https://app.com' },
      });
      vi.stubGlobal('navigator', { credentials: { get } });

      await expect(requestHandleAssist({ fallback })).resolves.toEqual(fallbackResult);
      expect(fallback).toHaveBeenCalledOnce();
    });

    it('uses the explicit fallback when Permissions Policy blocks FedCM', async () => {
      const fallback = vi.fn().mockResolvedValue(null);
      Object.defineProperty(document, 'permissionsPolicy', {
        configurable: true,
        value: { allowsFeature: vi.fn().mockReturnValue(false) },
      });

      await expect(requestHandleAssist({ fallback })).resolves.toBeNull();
      expect(fallback).toHaveBeenCalledOnce();

      Reflect.deleteProperty(document, 'permissionsPolicy');
    });

    describe('Step 3: registered IdP discovery (types / auto)', () => {
      it('sends single type without configURL in types mode', async () => {
        const get = vi.fn().mockResolvedValue({ token: validToken });
        vi.stubGlobal('window', {
          IdentityCredential: class {},
          location: { origin: 'https://app.com' },
        });
        vi.stubGlobal('navigator', { credentials: { get } });
        const input = document.createElement('input');

        const result = await requestHandleAssist({
          discovery: 'types',
          type: 'https://atpassport.net/',
          targetInput: input,
        });

        expect(result).toMatchObject({ username: 'alice.bsky.social' });
        expect(input.value).toBe('alice.bsky.social');
        expect(get).toHaveBeenCalledWith(expect.objectContaining({
          identity: expect.objectContaining({
            mode: 'active',
            providers: [{
              type: 'https://atpassport.net',
              clientId: 'https://app.com',
              fields: ['username', 'picture'],
            }],
          }),
        }));
        // Verify configURL was omitted
        const calledProvider = get.mock.calls[0][0].identity.providers[0];
        expect(calledProvider.configURL).toBeUndefined();
      });

      it('rejects invalid type URL without calling navigator.credentials.get or fallback', async () => {
        const get = vi.fn();
        const fallback = vi.fn();
        const onError = vi.fn();
        vi.stubGlobal('window', {
          IdentityCredential: class {},
          location: { origin: 'https://app.com' },
        });
        vi.stubGlobal('navigator', { credentials: { get } });

        const result = await requestHandleAssist({
          discovery: 'types',
          type: 'not-a-valid-url',
          fallback,
          onError,
        });

        expect(result).toBeNull();
        expect(get).not.toHaveBeenCalled();
        expect(fallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
          message: expect.stringContaining('Invalid provider type URL'),
        }));
      });

      it('in types mode: calls fallback when type is unsupported (TypeError / NotSupportedError)', async () => {
        const get = vi.fn().mockRejectedValue(new TypeError('Member configURL required'));
        const fallbackResult = {
          did: 'did:plc:fallback',
          username: 'fallback.example',
          token: JSON.stringify({ v: 1, did: 'did:plc:fallback', username: 'fallback.example' }),
        };
        const fallback = vi.fn().mockResolvedValue(fallbackResult);
        vi.stubGlobal('window', {
          IdentityCredential: class {},
          location: { origin: 'https://app.com' },
        });
        vi.stubGlobal('navigator', { credentials: { get } });

        const result = await requestHandleAssist({
          discovery: 'types',
          fallback,
        });

        expect(result).toEqual(fallbackResult);
        expect(fallback).toHaveBeenCalledOnce();
      });

      it('in types mode: returns null without fallback on cancel (AbortError), NetworkError, or IdentityCredentialError', async () => {
        const errors = [
          new DOMException('User dismissed', 'AbortError'),
          new DOMException('Network failure', 'NetworkError'),
          new DOMException('Credential error', 'IdentityCredentialError'),
          new DOMException('Not allowed', 'NotAllowedError'),
        ];

        for (const err of errors) {
          const get = vi.fn().mockRejectedValue(err);
          const fallback = vi.fn();
          const onError = vi.fn();
          vi.stubGlobal('window', {
            IdentityCredential: class {},
            location: { origin: 'https://app.com' },
          });
          vi.stubGlobal('navigator', { credentials: { get } });

          const result = await requestHandleAssist({
            discovery: 'types',
            fallback,
            onError,
          });

          expect(result).toBeNull();
          expect(fallback).not.toHaveBeenCalled();
          expect(onError).toHaveBeenCalledWith(err);
        }
      });

      it('in auto mode: retries with configURL once when type throws TypeError or NotSupportedError', async () => {
        const get = vi.fn()
          .mockRejectedValueOnce(new TypeError('type is not supported'))
          .mockResolvedValueOnce({ token: validToken });
        const fallback = vi.fn();
        vi.stubGlobal('window', {
          IdentityCredential: class {},
          location: { origin: 'https://app.com' },
        });
        vi.stubGlobal('navigator', { credentials: { get } });

        const result = await requestHandleAssist({
          discovery: 'auto',
          fallback,
        });

        expect(result).toMatchObject({ username: 'alice.bsky.social' });
        expect(get).toHaveBeenCalledTimes(2);
        // First call used type
        expect(get.mock.calls[0][0].identity.providers[0]).toHaveProperty('type');
        // Second call used configURL
        expect(get.mock.calls[1][0].identity.providers[0]).toHaveProperty('configURL');
        expect(fallback).not.toHaveBeenCalled();
      });

      it('in auto mode: does not retry configURL and returns null on user cancel (AbortError) or NetworkError', async () => {
        const get = vi.fn().mockRejectedValue(new DOMException('Prompt closed', 'NetworkError'));
        const fallback = vi.fn();
        const onError = vi.fn();
        vi.stubGlobal('window', {
          IdentityCredential: class {},
          location: { origin: 'https://app.com' },
        });
        vi.stubGlobal('navigator', { credentials: { get } });

        const result = await requestHandleAssist({
          discovery: 'auto',
          fallback,
          onError,
        });

        expect(result).toBeNull();
        expect(get).toHaveBeenCalledTimes(1);
        expect(fallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ name: 'NetworkError' }));
      });

      it('in auto mode: falls back if both type and configURL are unsupported', async () => {
        const get = vi.fn()
          .mockRejectedValueOnce(new TypeError('type unsupported'))
          .mockRejectedValueOnce(new DOMException('FedCM disabled', 'NotSupportedError'));
        const fallbackResult = {
          did: 'did:plc:fb',
          username: 'fb.example',
          token: JSON.stringify({ v: 1, did: 'did:plc:fb', username: 'fb.example' }),
        };
        const fallback = vi.fn().mockResolvedValue(fallbackResult);
        vi.stubGlobal('window', {
          IdentityCredential: class {},
          location: { origin: 'https://app.com' },
        });
        vi.stubGlobal('navigator', { credentials: { get } });

        const result = await requestHandleAssist({
          discovery: 'auto',
          fallback,
        });

        expect(result).toEqual(fallbackResult);
        expect(get).toHaveBeenCalledTimes(2);
        expect(fallback).toHaveBeenCalledOnce();
      });

      it('in auto mode: returns null without fallback if configURL retry encounters gesture expiration (SecurityError)', async () => {
        const get = vi.fn()
          .mockRejectedValueOnce(new TypeError('type unsupported'))
          .mockRejectedValueOnce(new DOMException('User activation expired', 'SecurityError'));
        const fallback = vi.fn();
        const onError = vi.fn();
        vi.stubGlobal('window', {
          IdentityCredential: class {},
          location: { origin: 'https://app.com' },
        });
        vi.stubGlobal('navigator', { credentials: { get } });

        const result = await requestHandleAssist({
          discovery: 'auto',
          fallback,
          onError,
        });

        expect(result).toBeNull();
        expect(get).toHaveBeenCalledTimes(2);
        expect(fallback).not.toHaveBeenCalled();
        expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'SecurityError' }));
      });

      it('forwards type and discovery from AtPassport instance, inheriting baseUrl as type default', async () => {
        const get = vi.fn().mockResolvedValue({ token: validToken });
        vi.stubGlobal('window', {
          IdentityCredential: class {},
          location: { origin: 'https://app.com' },
        });
        vi.stubGlobal('navigator', { credentials: { get } });

        const passport = new AtPassport({
          baseUrl: 'http://localhost:3000',
          callbackUrl: 'https://app.com/cb',
          fedcm: { discovery: 'types' },
        });

        const result = await passport.requestHandleAssist();
        expect(result).toMatchObject({ username: 'alice.bsky.social' });
        expect(get).toHaveBeenCalledWith(expect.objectContaining({
          identity: expect.objectContaining({
            providers: [expect.objectContaining({
              type: 'http://localhost:3000',
            })],
          }),
        }));
      });
    });
  });
});
