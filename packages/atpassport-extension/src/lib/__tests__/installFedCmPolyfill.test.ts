import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFedCmPolyfill } from '../installFedCmPolyfill';

describe('page-world FedCM bridge', () => {
  let originalGet: ReturnType<typeof vi.fn>;
  const credentialsDescriptor = Object.getOwnPropertyDescriptor(navigator, 'credentials');
  const identityDescriptor = Object.getOwnPropertyDescriptor(window, 'IdentityCredential');

  beforeEach(() => {
    originalGet = vi.fn().mockResolvedValue(null);
    Object.defineProperty(navigator, 'credentials', {
      configurable: true, value: { get: originalGet },
    });
    Reflect.deleteProperty(window, 'IdentityCredential');
  });

  afterEach(() => {
    if (credentialsDescriptor) Object.defineProperty(navigator, 'credentials', credentialsDescriptor);
    else Reflect.deleteProperty(navigator, 'credentials');
    if (identityDescriptor) Object.defineProperty(window, 'IdentityCredential', identityDescriptor);
    else Reflect.deleteProperty(window, 'IdentityCredential');
  });

  const options = {
    identity: { providers: [{ configURL: 'https://atpassport.net/fedcm/config.json' }] },
  } as CredentialRequestOptions;

  it('round-trips serialized events from the isolated content script', async () => {
    installFedCmPolyfill();
    window.addEventListener('atpassport-fedcm-request', event => {
      const data = JSON.parse((event as CustomEvent).detail);
      expect(data.options).toEqual(options);
      window.dispatchEvent(new CustomEvent('atpassport-fedcm-response', {
        detail: JSON.stringify({ requestId: data.requestId, token: 'selected-handle' }),
      }));
    }, { once: true });
    await expect(navigator.credentials.get(options)).resolves.toEqual({
      token: 'selected-handle', type: 'identity',
    });
    expect(originalGet).not.toHaveBeenCalled();
  });

  it('returns cancellation to the caller', async () => {
    installFedCmPolyfill();
    window.addEventListener('atpassport-fedcm-request', event => {
      const { requestId } = JSON.parse((event as CustomEvent).detail);
      window.dispatchEvent(new CustomEvent('atpassport-fedcm-response', {
        detail: JSON.stringify({ requestId, error: { name: 'AbortError', message: 'Dismissed' } }),
      }));
    }, { once: true });
    await expect(navigator.credentials.get(options)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('preserves other credential requests and does not wrap twice', async () => {
    installFedCmPolyfill();
    const get = navigator.credentials.get;
    installFedCmPolyfill();
    expect(navigator.credentials.get).toBe(get);
    await navigator.credentials.get({ password: true } as CredentialRequestOptions);
    expect(originalGet).toHaveBeenCalledOnce();
  });

  it('leaves native FedCM untouched', () => {
    Object.defineProperty(window, 'IdentityCredential', { configurable: true, value: class {} });
    installFedCmPolyfill();
    expect(navigator.credentials.get).toBe(originalGet);
  });
});
