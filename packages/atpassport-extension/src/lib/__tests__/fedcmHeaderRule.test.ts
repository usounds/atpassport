import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const dnr = vi.hoisted(() => ({ updateDynamicRules: vi.fn(), getSessionRules: vi.fn(), updateSessionRules: vi.fn() }));
vi.mock('wxt/browser', () => ({ browser: { declarativeNetRequest: dnr } }));

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers(); vi.stubEnv('BROWSER', 'firefox');
  dnr.updateDynamicRules.mockResolvedValue(undefined);
  dnr.getSessionRules.mockResolvedValue([{ id: 10042 }, { id: 42 }]);
  dnr.updateSessionRules.mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('selection-scoped FedCM headers', () => {
  it('removes the legacy blanket rule and stale session grants on startup', async () => {
    const { setupFedCmHeaderRule } = await import('../fedcmHeaderRule');
    await setupFedCmHeaderRule();
    expect(dnr.updateDynamicRules).toHaveBeenCalledWith({ removeRuleIds: [1001] });
    expect(dnr.updateSessionRules).toHaveBeenCalledWith({ removeRuleIds: [10042] });
    expect(dnr.updateDynamicRules.mock.calls.some(([arg]) => arg.addRules?.length)).toBe(false);
  });
  it('only authorizes the random exact URL, selected tab and POST; cleans up on completion', async () => {
    const { prepareAssertionRule, releaseAssertionRule } = await import('../fedcmHeaderRule');
    const grant = await prepareAssertionRule('https://atpassport.net', 7);
    expect(grant.assertionUrl).toMatch(/extension_request=[a-f0-9-]+$/);
    const rule = dnr.updateSessionRules.mock.calls.at(-1)![0].addRules[0];
    expect(rule.condition).toMatchObject({ urlFilter: `|${grant.assertionUrl}|`, tabIds: [7], requestMethods: ['post'] });
    const count = dnr.updateSessionRules.mock.calls.length;
    await releaseAssertionRule(grant.ruleId, 8);
    expect(dnr.updateSessionRules).toHaveBeenCalledTimes(count);
    await releaseAssertionRule(grant.ruleId, 7);
    expect(dnr.updateSessionRules).toHaveBeenLastCalledWith({ removeRuleIds: [grant.ruleId] });
  });
  it('expires abandoned grants and never authorizes arbitrary origins', async () => {
    const { prepareAssertionRule } = await import('../fedcmHeaderRule');
    await expect(prepareAssertionRule('https://evil.example', 7)).rejects.toThrow();
    const grant = await prepareAssertionRule('https://atpassport.net', 7);
    await vi.advanceTimersByTimeAsync(15000);
    expect(dnr.updateSessionRules).toHaveBeenLastCalledWith({ removeRuleIds: [grant.ruleId] });
  });
  it('does not return a capability if DNR installation fails', async () => {
    const { prepareAssertionRule, setupFedCmHeaderRule } = await import('../fedcmHeaderRule');
    await setupFedCmHeaderRule();
    dnr.updateSessionRules.mockRejectedValueOnce(new Error('denied'));
    await expect(prepareAssertionRule('https://atpassport.net', 7)).rejects.toThrow('denied');
  });
});
