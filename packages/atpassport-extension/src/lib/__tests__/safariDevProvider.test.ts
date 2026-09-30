import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveSafariDevProvider } from '../safariDevProvider';
import { getAccountStorageKey, normalizeTypeUrl } from '../accountStorage';

afterEach(() => vi.unstubAllEnvs());

describe('Safari development provider routing', () => {
  it('resolves mainnet config and type to the saved development origin', () => {
    vi.stubEnv('BROWSER', 'safari');
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('WXT_IDP_ORIGIN', 'https://dev.atpassport.net');
    const result = resolveSafariDevProvider({
      configURL: 'https://atpassport.net/fedcm/config.json',
      type: 'https://atpassport.net',
    });
    expect(getAccountStorageKey(new URL(result.configURL!).origin))
      .toBe(getAccountStorageKey('https://dev.atpassport.net'));
    expect(normalizeTypeUrl(result.type!)).toBe('https://dev.atpassport.net');
  });

  it.each([['safari', 'production'], ['firefox', 'development'], ['chrome', 'development']])(
    'preserves requests in %s %s', (browser, mode) => {
      vi.stubEnv('BROWSER', browser);
      vi.stubEnv('MODE', mode);
      const provider = { configURL: 'https://atpassport.net/fedcm/config.json', type: 'https://atpassport.net' };
      expect(resolveSafariDevProvider(provider)).toEqual(provider);
    },
  );

  it('preserves explicitly requested other origins', () => {
    vi.stubEnv('BROWSER', 'safari');
    vi.stubEnv('MODE', 'development');
    const provider = { configURL: 'https://staging.atpassport.net/fedcm/config.json', type: 'https://dev.atpassport.net' };
    expect(resolveSafariDevProvider(provider)).toEqual(provider);
  });
});
