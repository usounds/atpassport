import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  savePushedAccounts,
  getPushedAccounts,
  clearPushedAccounts,
  getAccountStorageKey,
  normalizeIdpOrigin,
} from '../accountStorage';
import { browser } from 'wxt/browser';

const mockStorage: Record<string, unknown> = {};

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (keys: string | string[]) => {
          if (Array.isArray(keys)) {
            const res: Record<string, unknown> = {};
            for (const k of keys) {
              if (k in mockStorage) res[k] = mockStorage[k];
            }
            return res;
          }
          return keys in mockStorage ? { [keys]: mockStorage[keys] } : {};
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(mockStorage, items);
        }),
        remove: vi.fn(async (key: string) => {
          delete mockStorage[key];
        }),
      },
    },
  },
}));

describe('accountStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k in mockStorage) {
      delete mockStorage[k];
    }
  });

  describe('normalizeIdpOrigin and getAccountStorageKey', () => {
    it('normalizes https origins and loopback urls', () => {
      expect(normalizeIdpOrigin('https://atpassport.net/foo/bar')).toBe('https://atpassport.net');
      expect(normalizeIdpOrigin('http://localhost:3000')).toBe('http://localhost:3000');
      expect(normalizeIdpOrigin('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
      expect(normalizeIdpOrigin('http://evil.com')).toBeNull(); // non-loopback http rejected
      expect(normalizeIdpOrigin('invalid-url')).toBeNull();
    });

    it('generates correct storage keys with context', () => {
      expect(getAccountStorageKey('https://atpassport.net')).toBe(
        'fedcm_idp_accounts:firefox-default:https://atpassport.net'
      );
      expect(getAccountStorageKey('https://atpassport.net', 'firefox-container-1')).toBe(
        'fedcm_idp_accounts:firefox-container-1:https://atpassport.net'
      );
      expect(getAccountStorageKey('invalid')).toBeNull();
    });
  });

  describe('savePushedAccounts and getPushedAccounts', () => {
    it('saves accounts and retrieves them', async () => {
      const accounts = [
        {
          id: 'did:plc:123',
          name: 'Alice',
          username: '@alice.bsky.social',
          picture: 'https://example.com/avatar.jpg',
        },
      ];

      await savePushedAccounts('https://atpassport.net', accounts);

      const retrieved = await getPushedAccounts('https://atpassport.net');
      expect(retrieved).toEqual(accounts);
    });

    it('isolates accounts across containers', async () => {
      const workAccounts = [
        { id: 'did:plc:work', name: 'WorkAlice', username: '@work.bsky.social' },
      ];
      const personalAccounts = [
        { id: 'did:plc:personal', name: 'PersonalAlice', username: '@personal.bsky.social' },
      ];

      await savePushedAccounts('https://atpassport.net', workAccounts, 'firefox-container-2');
      await savePushedAccounts('https://atpassport.net', personalAccounts, 'firefox-container-1');

      expect(await getPushedAccounts('https://atpassport.net', 'firefox-container-2')).toEqual(workAccounts);
      expect(await getPushedAccounts('https://atpassport.net', 'firefox-container-1')).toEqual(personalAccounts);
      expect(await getPushedAccounts('https://atpassport.net', 'firefox-default')).toEqual([]);
    });

    it('retrieves legacy stored accounts when using default context', async () => {
      const legacyAccounts = [
        { id: 'did:plc:legacy', name: 'LegacyUser', username: '@legacy' },
      ];
      mockStorage['fedcm_idp_accounts:https://atpassport.net'] = {
        origin: 'https://atpassport.net',
        accounts: legacyAccounts,
        updatedAt: Date.now(),
      };

      const retrieved = await getPushedAccounts('https://atpassport.net', 'firefox-default');
      expect(retrieved).toEqual(legacyAccounts);

      // But non-default container does NOT see legacy accounts
      expect(await getPushedAccounts('https://atpassport.net', 'firefox-container-1')).toEqual([]);
    });

    it('clears storage entry when empty array is saved', async () => {
      await savePushedAccounts('https://atpassport.net', [
        { id: 'did:plc:123', name: 'Alice', username: '@alice.bsky.social' },
      ]);
      expect(await getPushedAccounts('https://atpassport.net')).toHaveLength(1);

      await savePushedAccounts('https://atpassport.net', []);
      expect(await getPushedAccounts('https://atpassport.net')).toEqual([]);
    });

    it('throws error for invalid origin', async () => {
      await expect(savePushedAccounts('http://evil.com', [])).rejects.toThrow(
        'Invalid IdP origin'
      );
    });

    it('returns empty array if entry is not in storage', async () => {
      const result = await getPushedAccounts('https://dev.atpassport.net');
      expect(result).toEqual([]);
    });
  });

  describe('clearPushedAccounts', () => {
    it('removes storage entry explicitly', async () => {
      await savePushedAccounts('https://atpassport.net', [
        { id: 'did:plc:123', name: 'Alice', username: '@alice.bsky.social' },
      ]);
      expect(await getPushedAccounts('https://atpassport.net')).toHaveLength(1);

      await clearPushedAccounts('https://atpassport.net');
      expect(await getPushedAccounts('https://atpassport.net')).toEqual([]);
    });
  });
});
