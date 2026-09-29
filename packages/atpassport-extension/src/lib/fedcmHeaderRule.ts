import { browser } from 'wxt/browser';
import { isAtPassportOrigin } from './fedcm-url';

// Remove the old blanket rule on upgrade. Only per-selection session rules remain.
export const FEDCM_HEADER_RULE_ID = 1001;
const FIRST_GRANT_ID = 10000;
const LAST_GRANT_ID = 19999;
let nextId = FIRST_GRANT_ID;
let initialization: Promise<void> | undefined;
const grants = new Map<number, { tabId: number; timer: ReturnType<typeof setTimeout> }>();

export function setupFedCmHeaderRule(): Promise<void> {
  if (import.meta.env.BROWSER !== 'firefox') return Promise.resolve();
  if (!initialization) {
    initialization = (async () => {
      const dnr = browser.declarativeNetRequest;
      await dnr.updateDynamicRules({ removeRuleIds: [FEDCM_HEADER_RULE_ID] });
      const rules = await dnr.getSessionRules();
      await dnr.updateSessionRules({
        removeRuleIds: rules.filter(r => r.id >= FIRST_GRANT_ID && r.id <= LAST_GRANT_ID).map(r => r.id),
      });
    })().catch(error => { initialization = undefined; throw error; });
  }
  return initialization;
}

export function createAssertionRule(id: number, tabId: number, url: string): chrome.declarativeNetRequest.Rule {
  return {
    id, priority: 1,
    action: {
      type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
      requestHeaders: [{ header: 'Sec-Fetch-Dest', operation: 'set' as chrome.declarativeNetRequest.HeaderOperation, value: 'webidentity' }],
    },
    condition: {
      urlFilter: `|${url}|`, isUrlFilterCaseSensitive: true,
      tabIds: [tabId], requestMethods: ['post' as chrome.declarativeNetRequest.RequestMethod],
      resourceTypes: ['xmlhttprequest' as chrome.declarativeNetRequest.ResourceType],
    },
  };
}

export async function releaseAssertionRule(id: number, tabId: number): Promise<void> {
  const grant = grants.get(id);
  if (!grant || grant.tabId !== tabId) return;
  await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id] });
  clearTimeout(grant.timer);
  grants.delete(id);
}

export async function prepareAssertionRule(origin: string, tabId: number): Promise<{ ruleId: number; assertionUrl: string }> {
  if (import.meta.env.BROWSER !== 'firefox' || !isAtPassportOrigin(origin) || new URL(origin).origin !== origin || tabId < 0) {
    throw new Error('Invalid assertion context');
  }
  await setupFedCmHeaderRule();
  if (grants.size >= 100) throw new Error('Too many pending assertions');
  while (grants.has(nextId)) nextId = nextId >= LAST_GRANT_ID ? FIRST_GRANT_ID : nextId + 1;
  const ruleId = nextId++;
  if (nextId > LAST_GRANT_ID) nextId = FIRST_GRANT_ID;
  // This capability remains in the extension isolated world, never in page events/logs.
  const assertionUrl = `${origin}/api/fedcm/assertion?extension_request=${crypto.randomUUID()}`;
  const timer = setTimeout(() => {
    void releaseAssertionRule(ruleId, tabId).catch(console.error);
  }, 15000);
  grants.set(ruleId, { tabId, timer });
  try {
    await browser.declarativeNetRequest.updateSessionRules({ addRules: [createAssertionRule(ruleId, tabId, assertionUrl)] });
  } catch (error) {
    clearTimeout(timer); grants.delete(ruleId); throw error;
  }
  return { ruleId, assertionUrl };
}
