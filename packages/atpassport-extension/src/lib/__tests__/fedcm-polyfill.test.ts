import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import injectedScript from '../../entrypoints/injected';

// Extract INLINE_POLYFILL_CODE from fedcm.content.ts
// We can view or read the content script or test the injected script and eval the code.
describe('FedCM Polyfill Parity and Registered Discovery', () => {
  let originalCredentials: unknown;
  let originalIdentityCredential: unknown;

  beforeEach(() => {
    originalCredentials = navigator.credentials;
    originalIdentityCredential = (window as unknown as { IdentityCredential: unknown }).IdentityCredential;
    delete (window as unknown as { IdentityCredential?: unknown }).IdentityCredential;
    // Reset credentials
    Object.defineProperty(navigator, 'credentials', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (originalCredentials !== undefined) {
      Object.defineProperty(navigator, 'credentials', {
        value: originalCredentials,
        configurable: true,
        writable: true,
      });
    }
    if (originalIdentityCredential !== undefined) {
      (window as unknown as { IdentityCredential: unknown }).IdentityCredential = originalIdentityCredential;
    } else {
      delete (window as unknown as { IdentityCredential?: unknown }).IdentityCredential;
    }
  });

  describe('injected.ts polyfill', () => {
    it('initializes IdentityCredential and credentials.get', () => {
      (injectedScript as { main: () => void }).main();

      expect((window as unknown as { IdentityCredential: unknown }).IdentityCredential).toBeDefined();
      expect(navigator.credentials).toBeDefined();
      expect(typeof navigator.credentials.get).toBe('function');
    });

    it('resolves null when background/content script responds with noMatch', async () => {
      (injectedScript as { main: () => void }).main();

      const requestPromise = (async () => {
        const handler = (e: Event) => {
          const detail = JSON.parse((e as CustomEvent).detail);
          expect(detail.requestId).toBeDefined();
          expect(detail.options.identity.providers[0].type).toBe('https://atpassport.net');

          window.dispatchEvent(
            new CustomEvent('atpassport-fedcm-response', {
              detail: JSON.stringify({
                requestId: detail.requestId,
                noMatch: true,
              }),
            })
          );
          window.removeEventListener('atpassport-fedcm-request', handler);
        };
        window.addEventListener('atpassport-fedcm-request', handler);

        return navigator.credentials.get({
          identity: {
            providers: [{ type: 'https://atpassport.net' }],
          },
        } as unknown as CredentialRequestOptions);
      })();

      const result = await requestPromise;
      expect(result).toBeNull();
    });

    it('resolves identity credential token when matching account is selected', async () => {
      (injectedScript as { main: () => void }).main();

      const requestPromise = (async () => {
        const handler = (e: Event) => {
          const detail = JSON.parse((e as CustomEvent).detail);
          window.dispatchEvent(
            new CustomEvent('atpassport-fedcm-response', {
              detail: JSON.stringify({
                requestId: detail.requestId,
                token: 'mock-jwt-token-123',
              }),
            })
          );
          window.removeEventListener('atpassport-fedcm-request', handler);
        };
        window.addEventListener('atpassport-fedcm-request', handler);

        return navigator.credentials.get({
          identity: {
            providers: [{ type: 'https://atpassport.net' }],
          },
        } as unknown as CredentialRequestOptions);
      })();

      const result = await requestPromise;
      expect(result).not.toBeNull();
      expect((result as unknown as { token: string }).token).toBe('mock-jwt-token-123');
      expect((result as unknown as { type: string }).type).toBe('identity');
    });

    it('rejects with DOMException when user cancels or error occurs', async () => {
      (injectedScript as { main: () => void }).main();

      const requestPromise = (async () => {
        const handler = (e: Event) => {
          const detail = JSON.parse((e as CustomEvent).detail);
          window.dispatchEvent(
            new CustomEvent('atpassport-fedcm-response', {
              detail: JSON.stringify({
                requestId: detail.requestId,
                error: {
                  name: 'AbortError',
                  message: 'User dismissed the credential manager.',
                },
              }),
            })
          );
          window.removeEventListener('atpassport-fedcm-request', handler);
        };
        window.addEventListener('atpassport-fedcm-request', handler);

        return navigator.credentials.get({
          identity: {
            providers: [{ type: 'https://atpassport.net' }],
          },
        } as unknown as CredentialRequestOptions);
      })();

      await expect(requestPromise).rejects.toThrow('User dismissed the credential manager.');
    });

    it('rejects with NotSupportedError for non-AtPassport type like alias "atpassport"', async () => {
      (injectedScript as { main: () => void }).main();

      await expect(
        navigator.credentials.get({
          identity: {
            providers: [{ type: 'atpassport' }],
          },
        } as unknown as CredentialRequestOptions)
      ).rejects.toThrow();
    });

    it('rejects with NotSupportedError for foreign provider type', async () => {
      (injectedScript as { main: () => void }).main();

      await expect(
        navigator.credentials.get({
          identity: {
            providers: [{ type: 'https://evil.com' }],
          },
        } as unknown as CredentialRequestOptions)
      ).rejects.toThrow();
    });

    it('does not intercept and delegates/rejects multi-provider requests', async () => {
      (injectedScript as { main: () => void }).main();

      const requestHandler = vi.fn();
      window.addEventListener('atpassport-fedcm-request', requestHandler);

      // Multiple providers including AtPassport
      const multiProviderOptions = {
        identity: {
          providers: [
            { type: 'https://atpassport.net' },
            { configURL: 'https://accounts.google.com/fedcm/config.json' },
          ],
        },
      } as unknown as CredentialRequestOptions;

      await expect(
        navigator.credentials.get(multiProviderOptions)
      ).rejects.toThrow('The operation is not supported.');

      // Must NOT dispatch atpassport-fedcm-request event
      expect(requestHandler).not.toHaveBeenCalled();

      window.removeEventListener('atpassport-fedcm-request', requestHandler);
    });

    it('delegates multi-provider request to originalGet if present', async () => {
      const mockOriginalGet = vi.fn().mockResolvedValue({ id: 'delegated' });
      Object.defineProperty(navigator, 'credentials', {
        value: { get: mockOriginalGet },
        configurable: true,
        writable: true,
      });

      (injectedScript as { main: () => void }).main();

      const multiProviderOptions = {
        identity: {
          providers: [
            { type: 'https://atpassport.net' },
            { configURL: 'https://accounts.google.com/fedcm/config.json' },
          ],
        },
      } as unknown as CredentialRequestOptions;

      const res = await navigator.credentials.get(multiProviderOptions);
      expect(mockOriginalGet).toHaveBeenCalledWith(multiProviderOptions);
      expect(res).toEqual({ id: 'delegated' });
    });

    it('propagates storage read failure as an IdentityCredentialError without converting to null', async () => {
      (injectedScript as { main: () => void }).main();

      const requestPromise = (async () => {
        const handler = (e: Event) => {
          const detail = JSON.parse((e as CustomEvent).detail);
          // Emulate content script reporting a storage read error
          window.dispatchEvent(
            new CustomEvent('atpassport-fedcm-response', {
              detail: JSON.stringify({
                requestId: detail.requestId,
                error: {
                  name: 'IdentityCredentialError',
                  message: 'Failed to read stored accounts from extension storage',
                },
              }),
            })
          );
          window.removeEventListener('atpassport-fedcm-request', handler);
        };
        window.addEventListener('atpassport-fedcm-request', handler);

        return navigator.credentials.get({
          identity: {
            providers: [{ type: 'https://atpassport.net' }],
          },
        } as unknown as CredentialRequestOptions);
      })();

      await expect(requestPromise).rejects.toThrow('Failed to read stored accounts from extension storage');
    });
  });
});
