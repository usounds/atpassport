vi.mock('../fedcmHeaderRule', () => ({ prepareAssertionRule: vi.fn(), releaseAssertionRule: vi.fn() }));
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleBackgroundMessage } from '../backgroundMessages';
import * as accountStorage from '../accountStorage';
import { prepareAssertionRule } from '../fedcmHeaderRule';

vi.mock('../accountStorage', () => ({
  savePushedAccounts: vi.fn(),
  getPushedAccounts: vi.fn(),
  clearPushedAccounts: vi.fn(),
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
    it.each([
      { incognito: true, cookieStoreId: 'firefox-private' },
      { cookieStoreId: 'firefox-container-1' },
      {},
    ])('does not fetch default cookies for unsupported tab context %j', async tab => {
      const res = await handleBackgroundMessage({ type: 'FETCH_ACCOUNTS' }, { tab });
      expect(res.success).toBe(false);
      expect(mockFetchAccounts).not.toHaveBeenCalled();
    });

    it('uses only the legacy endpoint for default context', async () => {
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

  describe('PREPARE_ASSERTION', () => {
    it.each([
      { url: 'https://rp.example', frameId: 1, tab: { id: 7, cookieStoreId: 'firefox-default' } },
      { url: 'https://rp.example', frameId: 0, tab: { id: 7, cookieStoreId: 'firefox-private', incognito: true } },
      { url: 'https://rp.example', frameId: 0, tab: { id: 7 } },
    ])('rejects unsupported sender %j before installing a rule', async sender => {
      const result = await handleBackgroundMessage({ type: 'PREPARE_ASSERTION', origin: 'https://atpassport.net' }, sender);
      expect(result.success).toBe(false);
      expect(prepareAssertionRule).not.toHaveBeenCalled();
    });
    it('binds the capability to the browser-supplied tab, not payload clientId', async () => {
      vi.mocked(prepareAssertionRule).mockResolvedValue({ ruleId: 10000, assertionUrl: 'https://atpassport.net/api/fedcm/assertion?extension_request=test' });
      const result = await handleBackgroundMessage({ type: 'PREPARE_ASSERTION', origin: 'https://atpassport.net', clientId: 'https://forged.example' },
        { url: 'https://rp.example', frameId: 0, tab: { id: 7, cookieStoreId: 'firefox-container-1' } });
      expect(result.success).toBe(true);
      expect(prepareAssertionRule).toHaveBeenCalledWith('https://atpassport.net', 7);
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

    it('should reject requests from private browsing context', async () => {
      const res = await handleBackgroundMessage(
        {
          type: 'SAVE_PUSHED_ACCOUNTS',
          origin: 'https://atpassport.net',
          accounts: [],
        },
        { tab: { url: 'https://atpassport.net', incognito: true, cookieStoreId: 'firefox-private' } }
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('Private browsing');
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

    it('should save accounts with sender container context', async () => {
      (accountStorage.savePushedAccounts as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const accounts = [{ id: 'did:plc:test', name: 'test', username: '@test.bsky.social' }];
      const res = await handleBackgroundMessage(
        {
          type: 'SAVE_PUSHED_ACCOUNTS',
          origin: 'https://atpassport.net',
          accounts,
        },
        { tab: { url: 'https://atpassport.net/en', cookieStoreId: 'firefox-container-2' } }
      );

      expect(res.success).toBe(true);
      expect(accountStorage.savePushedAccounts).toHaveBeenCalledWith(
        'https://atpassport.net',
        accounts,
        'firefox-container-2'
      );
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
      expect(accountStorage.savePushedAccounts).toHaveBeenCalledWith(
        'http://localhost:3000',
        [],
        'firefox-default'
      );
    });
  });

  describe('GET_STORED_ACCOUNTS', () => {
    it('should retrieve accounts by origin and contextKey', async () => {
      const mockAccounts = [{ id: 'did:plc:123', name: 'User', username: '@user' }];
      (accountStorage.getPushedAccounts as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccounts);

      const res = await handleBackgroundMessage(
        {
          type: 'GET_STORED_ACCOUNTS',
          origin: 'https://atpassport.net',
        },
        { tab: { cookieStoreId: 'firefox-container-1' } }
      );

      expect(res.success).toBe(true);
      expect(res.accounts).toEqual(mockAccounts);
      expect(accountStorage.getPushedAccounts).toHaveBeenCalledWith(
        'https://atpassport.net',
        'firefox-container-1'
      );
    });

    it('should return empty accounts in private browsing context', async () => {
      const res = await handleBackgroundMessage(
        {
          type: 'GET_STORED_ACCOUNTS',
          origin: 'https://atpassport.net',
        },
        { tab: { incognito: true } }
      );

      expect(res.success).toBe(true);
      expect(res.accounts).toEqual([]);
      expect(accountStorage.getPushedAccounts).not.toHaveBeenCalled();
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
      expect(accountStorage.getPushedAccounts).toHaveBeenCalledWith(
        'https://dev.atpassport.net',
        'firefox-default'
      );
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

  describe('CLEAR_STORED_ACCOUNTS', () => {
    it('should clear stored accounts for origin and context', async () => {
      (accountStorage.clearPushedAccounts as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const res = await handleBackgroundMessage(
        {
          type: 'CLEAR_STORED_ACCOUNTS',
          origin: 'https://atpassport.net',
        },
        { tab: { cookieStoreId: 'firefox-container-1' } }
      );

      expect(res.success).toBe(true);
      expect(accountStorage.clearPushedAccounts).toHaveBeenCalledWith(
        'https://atpassport.net',
        'firefox-container-1'
      );
    });
  });
});
