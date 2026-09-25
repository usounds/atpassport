import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  FEDCM_HEADER_RULE_ID,
  getFedCmUrlRegex,
  createFedCmHeaderRule,
  setupFedCmHeaderRule,
} from '../fedcmHeaderRule';

describe('fedcmHeaderRule', () => {
  describe('getFedCmUrlRegex', () => {
    describe('production mode', () => {
      const prodRegex = new RegExp(getFedCmUrlRegex(false));

      it('should match valid atpassport.net FedCM endpoints', () => {
        expect(prodRegex.test('https://atpassport.net/api/fedcm/accounts')).toBe(true);
        expect(prodRegex.test('https://atpassport.net/api/fedcm/assertion')).toBe(true);
        expect(prodRegex.test('https://preview.atpassport.net/api/fedcm/accounts')).toBe(true);
        expect(prodRegex.test('https://staging.atpassport.net/api/fedcm/assertion')).toBe(true);
      });

      it('should NOT match non-FedCM endpoints', () => {
        expect(prodRegex.test('https://atpassport.net/api/user/handles')).toBe(false);
        expect(prodRegex.test('https://atpassport.net/dashboard')).toBe(false);
        expect(prodRegex.test('https://atpassport.net/login')).toBe(false);
      });

      it('should NOT match untrusted domains or phishing domains', () => {
        expect(prodRegex.test('https://evil-atpassport.net/api/fedcm/accounts')).toBe(false);
        expect(prodRegex.test('https://fakeatpassport.net/api/fedcm/accounts')).toBe(false);
        expect(prodRegex.test('https://atpassport.net.attacker.com/api/fedcm/accounts')).toBe(false);
      });

      it('should NOT match unencrypted HTTP in production', () => {
        expect(prodRegex.test('http://atpassport.net/api/fedcm/accounts')).toBe(false);
      });

      it('should NOT match localhost in production mode', () => {
        expect(prodRegex.test('http://localhost:3000/api/fedcm/accounts')).toBe(false);
      });
    });

    describe('development mode', () => {
      const devRegex = new RegExp(getFedCmUrlRegex(true));

      it('should match localhost and 127.0.0.1 in development mode', () => {
        expect(devRegex.test('http://localhost:3000/api/fedcm/accounts')).toBe(true);
        expect(devRegex.test('http://127.0.0.1:3000/api/fedcm/assertion')).toBe(true);
        expect(devRegex.test('https://localhost:3000/api/fedcm/accounts')).toBe(true);
      });

      it('should still match production URLs in development mode', () => {
        expect(devRegex.test('https://atpassport.net/api/fedcm/accounts')).toBe(true);
        expect(devRegex.test('https://preview.atpassport.net/api/fedcm/accounts')).toBe(true);
      });

      it('should still NOT match non-FedCM paths in development mode', () => {
        expect(devRegex.test('http://localhost:3000/api/user/handles')).toBe(false);
      });
    });
  });

  describe('createFedCmHeaderRule', () => {
    it('should construct a valid declarativeNetRequest Rule', () => {
      const rule = createFedCmHeaderRule(false);

      expect(rule.id).toBe(FEDCM_HEADER_RULE_ID);
      expect(rule.priority).toBe(1);
      expect(rule.action).toEqual({
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: 'Sec-Fetch-Dest',
            operation: 'set',
            value: 'webidentity',
          },
        ],
      });
      expect(rule.condition.resourceTypes).toEqual(['xmlhttprequest']);
      expect(rule.condition.regexFilter).toBe(getFedCmUrlRegex(false));
    });
  });

  describe('setupFedCmHeaderRule', () => {
    let mockUpdateDynamicRules: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockUpdateDynamicRules = vi.fn().mockResolvedValue(undefined);

      vi.stubGlobal('browser', {
        declarativeNetRequest: {
          updateDynamicRules: mockUpdateDynamicRules,
        },
      });
    });

    it('should register dynamic rules with deduplication on Firefox', async () => {
      vi.stubEnv('BROWSER', 'firefox');

      await setupFedCmHeaderRule();

      expect(mockUpdateDynamicRules).toHaveBeenCalledTimes(1);
      const callArgs = mockUpdateDynamicRules.mock.calls[0]?.[0];
      expect(callArgs?.removeRuleIds).toEqual([FEDCM_HEADER_RULE_ID]);
      expect(callArgs?.addRules).toHaveLength(1);
      expect(callArgs?.addRules?.[0]?.id).toBe(FEDCM_HEADER_RULE_ID);
    });

    it('should NOT register rules when running on Chrome', async () => {
      vi.stubEnv('BROWSER', 'chrome');

      await setupFedCmHeaderRule();

      expect(mockUpdateDynamicRules).not.toHaveBeenCalled();
    });
  });
});
