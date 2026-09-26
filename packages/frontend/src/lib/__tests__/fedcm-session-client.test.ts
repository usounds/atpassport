import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  toFedCmAccount,
  getFedCmConfigUrl,
  hasLoginStatusSupport,
  hasIdpRegistrationSupport,
  syncAccountsPush,
  registerIdp,
  unregisterIdp,
  type FedCmAccount,
} from '../fedcm-session-client';

describe('FedCM session client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  describe('toFedCmAccount', () => {
    it('maps association and profile correctly', () => {
      const item = {
        did: 'did:plc:test1234',
        handle: '@alice.bsky.social',
        profile: {
          displayName: 'Alice',
          avatar: 'https://example.com/alice.jpg',
        },
      };

      const account = toFedCmAccount(item);
      expect(account).toEqual({
        id: 'did:plc:test1234',
        name: 'Alice',
        username: '@alice.bsky.social',
        picture: 'https://example.com/alice.jpg',
        approved_clients: [],
      });
    });

    it('falls back to handle when displayName is missing', () => {
      const item = {
        did: 'did:plc:test1234',
        handle: 'bob.bsky.social',
        profile: null,
      };

      const account = toFedCmAccount(item);
      expect(account).toEqual({
        id: 'did:plc:test1234',
        name: 'bob.bsky.social',
        username: '@bob.bsky.social',
        approved_clients: [],
      });
    });
  });

  describe('getFedCmConfigUrl', () => {
    it('returns config URL based on window.location.origin', () => {
      vi.stubGlobal('window', {
        location: { origin: 'http://localhost:3000' },
      });
      expect(getFedCmConfigUrl()).toBe('http://localhost:3000/fedcm/config.json');
    });

    it('defaults to atpassport.net if window is undefined', () => {
      vi.stubGlobal('window', undefined);
      expect(getFedCmConfigUrl()).toBe('https://atpassport.net/fedcm/config.json');
    });
  });

  describe('feature detection', () => {
    it('detects login status support correctly', () => {
      vi.stubGlobal('navigator', { login: { setStatus: vi.fn() } });
      expect(hasLoginStatusSupport()).toBe(true);

      vi.stubGlobal('navigator', {});
      expect(hasLoginStatusSupport()).toBe(false);
    });

    it('detects IdP registration support correctly', () => {
      vi.stubGlobal('window', {
        IdentityProvider: { register: vi.fn(), unregister: vi.fn() },
      });
      expect(hasIdpRegistrationSupport()).toBe(true);

      vi.stubGlobal('window', {});
      expect(hasIdpRegistrationSupport()).toBe(false);
    });
  });

  describe('syncAccountsPush', () => {
    it('calls setStatus with accounts when accounts are present', async () => {
      const setStatusMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { login: { setStatus: setStatusMock } });

      const accounts: FedCmAccount[] = [
        { id: 'did:plc:1', name: 'User 1', username: '@user1', approved_clients: [] },
      ];

      await syncAccountsPush(accounts);

      expect(setStatusMock).toHaveBeenCalledWith('logged-in', { accounts });
    });

    it('falls back to single-argument setStatus when 2-arg call fails', async () => {
      const setStatusMock = vi
        .fn()
        .mockRejectedValueOnce(new TypeError('1 argument required, but 2 present'))
        .mockResolvedValueOnce(undefined);
      vi.stubGlobal('navigator', { login: { setStatus: setStatusMock } });

      const accounts: FedCmAccount[] = [
        { id: 'did:plc:1', name: 'User 1', username: '@user1', approved_clients: [] },
      ];

      await syncAccountsPush(accounts);

      expect(setStatusMock).toHaveBeenCalledTimes(2);
      expect(setStatusMock).toHaveBeenNthCalledWith(1, 'logged-in', { accounts });
      expect(setStatusMock).toHaveBeenNthCalledWith(2, 'logged-in');
    });

    it('calls setStatus("logged-out") when accounts array is empty', async () => {
      const setStatusMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { login: { setStatus: setStatusMock } });

      await syncAccountsPush([]);

      expect(setStatusMock).toHaveBeenCalledWith('logged-out');
    });

    it('handles undefined navigator gracefully without throwing', async () => {
      vi.stubGlobal('navigator', undefined);
      await expect(syncAccountsPush([])).resolves.toBeUndefined();
    });
  });

  describe('registerIdp and unregisterIdp', () => {
    it('calls IdentityProvider.register when available', async () => {
      const registerMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('window', {
        location: { origin: 'https://atpassport.net' },
        IdentityProvider: { register: registerMock },
      });

      const res = await registerIdp();
      expect(res).toEqual({ success: true });
      expect(registerMock).toHaveBeenCalledWith('https://atpassport.net/fedcm/config.json');
    });

    it('returns not_supported when IdentityProvider is missing', async () => {
      vi.stubGlobal('window', { location: { origin: 'https://atpassport.net' } });

      const res = await registerIdp();
      expect(res).toEqual({ success: false, error: 'not_supported' });
    });

    it('calls IdentityProvider.unregister when available', async () => {
      const unregisterMock = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('window', {
        location: { origin: 'https://atpassport.net' },
        IdentityProvider: { unregister: unregisterMock },
      });

      const res = await unregisterIdp();
      expect(res).toEqual({ success: true });
      expect(unregisterMock).toHaveBeenCalledWith('https://atpassport.net/fedcm/config.json');
    });
  });

  describe('ensureFedCmSession', () => {
    it('returns the verified readiness flag without exposing cookie data', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ ready: true }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ready: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        );
      vi.stubGlobal('fetch', fetchMock);
      const { ensureFedCmSession } = await import('../fedcm-session-client');

      await expect(ensureFedCmSession()).resolves.toBe(true);
      expect(fetchMock).toHaveBeenCalledWith('/api/fedcm/migrate', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/fedcm/status', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
    });

    it('deduplicates migration requests on the same page', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ ready: false }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ready: false }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        );
      vi.stubGlobal('fetch', fetchMock);
      const { ensureFedCmSession } = await import('../fedcm-session-client');

      await Promise.all([ensureFedCmSession(), ensureFedCmSession()]);

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
