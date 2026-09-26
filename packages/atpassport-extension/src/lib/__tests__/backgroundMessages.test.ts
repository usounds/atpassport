import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleBackgroundMessage } from '../backgroundMessages';
import * as accountStorage from '../accountStorage';
import { HandleManager } from '../HandleManager';

vi.mock('../accountStorage', () => ({
  savePushedAccounts: vi.fn(),
  getPushedAccounts: vi.fn(),
  normalizeIdpOrigin: vi.fn((origin: string) => {
    try {
      const u = new URL(origin);
      return u.origin;
    } catch {
      return null;
    }
  }),
}));

const mockFetchAccounts = vi.fn();

vi.mock('../HandleManager', () => {
  return {
    HandleManager: class {
      fetchAccounts = mockFetchAccounts;
    },
    getDefaultIdpOrigin: () => 'https://atpassport.net',
  };
});

describe('handleBackgroundMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invalid or unknown messages', () => {
    it('should reject invalid message objects', async () => {
      const res = await handleBackgroundMessage(null, {});
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid message');
    });

    it('should reject unknown message types', async () => {
      const res = await handleBackgroundMessage({ type: 'UNKNOWN_ACTION' }, {});
      expect(res.success).toBe(false);
      expect(res.error).toBe('Unknown message type: UNKNOWN_ACTION');
    });
  });

  describe('FETCH_ACCOUNTS', () => {
    it('should fetch accounts from /api/fedcm/accounts when endpoint succeeds', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          accounts: [
            { id: 'did:plc:123', name: 'User', username: '@user.bsky.social' },
          ],
        }),
      });

      try {
        const res = await handleBackgroundMessage({ type: 'FETCH_ACCOUNTS' }, {});
        expect(res.success).toBe(true);
        expect(res.accounts).toEqual([
          { did: 'did:plc:123', displayName: 'User', handle: '@user.bsky.social', avatar: undefined },
        ]);
        expect(mockFetchAccounts).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should fallback to HandleManager.fetchAccounts if fedcm endpoint fails', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('FedCM offline'));
      const mockAccounts = [{ handle: '@user.bsky.social', displayName: 'User' }];
      mockFetchAccounts.mockResolvedValue(mockAccounts);

      try {
        const res = await handleBackgroundMessage({ type: 'FETCH_ACCOUNTS' }, {});
        expect(res.success).toBe(true);
        expect(res.accounts).toEqual(mockAccounts);
        expect(mockFetchAccounts).toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should handle fetchAccounts error gracefully', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('FedCM offline'));
      mockFetchAccounts.mockRejectedValue(new Error('Network failure'));

      try {
        const res = await handleBackgroundMessage({ type: 'FETCH_ACCOUNTS' }, {});
        expect(res.success).toBe(false);
        expect(res.error).toBe('Network failure');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });


  describe('SAVE_PUSHED_ACCOUNTS', () => {
    it('should reject requests from unauthorized origins', async () => {
      const res = await handleBackgroundMessage(
        {
          type: 'SAVE_PUSHED_ACCOUNTS',
          origin: 'https://evil.com',
          accounts: [{ id: 'did:plc:123', name: 'evil', username: '@evil' }],
        },
        { origin: 'https://evil.com' }
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe('Unauthorized sender origin');
      expect(accountStorage.savePushedAccounts).not.toHaveBeenCalled();
    });

    it('should reject requests where target origin mismatches sender origin', async () => {
      const res = await handleBackgroundMessage(
        {
          type: 'SAVE_PUSHED_ACCOUNTS',
          origin: 'https://other.atpassport.net',
          accounts: [],
        },
        { origin: 'https://atpassport.net' }
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe('Origin mismatch');
      expect(accountStorage.savePushedAccounts).not.toHaveBeenCalled();
    });

    it('should save accounts when sender is valid AtPassport origin', async () => {
      (accountStorage.savePushedAccounts as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const accounts = [{ id: 'did:plc:test', name: 'test', username: '@test.bsky.social' }];
      const res = await handleBackgroundMessage(
        {
          type: 'SAVE_PUSHED_ACCOUNTS',
          origin: 'https://atpassport.net',
          accounts,
        },
        { tab: { url: 'https://atpassport.net/en' } }
      );

      expect(res.success).toBe(true);
      expect(accountStorage.savePushedAccounts).toHaveBeenCalledWith('https://atpassport.net', accounts);
    });

    it('should allow save accounts in local development', async () => {
      (accountStorage.savePushedAccounts as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const res = await handleBackgroundMessage(
        {
          type: 'SAVE_PUSHED_ACCOUNTS',
          origin: 'http://localhost:3000',
          accounts: [],
        },
        { url: 'http://localhost:3000/en' }
      );

      expect(res.success).toBe(true);
      expect(accountStorage.savePushedAccounts).toHaveBeenCalledWith('http://localhost:3000', []);
    });
  });

  describe('GET_STORED_ACCOUNTS', () => {
    it('should retrieve accounts by origin', async () => {
      const mockAccounts = [{ id: 'did:plc:123', name: 'User', username: '@user' }];
      (accountStorage.getPushedAccounts as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccounts);

      const res = await handleBackgroundMessage(
        {
          type: 'GET_STORED_ACCOUNTS',
          origin: 'https://atpassport.net',
        },
        {}
      );

      expect(res.success).toBe(true);
      expect(res.accounts).toEqual(mockAccounts);
      expect(accountStorage.getPushedAccounts).toHaveBeenCalledWith('https://atpassport.net');
    });

    it('should retrieve accounts by configURL', async () => {
      const mockAccounts = [{ id: 'did:plc:123', name: 'User', username: '@user' }];
      (accountStorage.getPushedAccounts as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccounts);

      const res = await handleBackgroundMessage(
        {
          type: 'GET_STORED_ACCOUNTS',
          configURL: 'https://dev.atpassport.net/fedcm/config.json',
        },
        {}
      );

      expect(res.success).toBe(true);
      expect(res.accounts).toEqual(mockAccounts);
      expect(accountStorage.getPushedAccounts).toHaveBeenCalledWith('https://dev.atpassport.net');
    });

    it('should reject invalid origins', async () => {
      const res = await handleBackgroundMessage(
        {
          type: 'GET_STORED_ACCOUNTS',
          origin: 'not-a-valid-origin',
        },
        {}
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid origin');
    });
  });
});
