export const FEDCM_HEADER_RULE_ID = 1001;

/**
 * Returns the RE2 regular expression for matching AtPassport FedCM endpoints.
 * In development mode, localhost and 127.0.0.1 loopback URLs are also permitted.
 */
export function getFedCmUrlRegex(isDev: boolean = false): string {
  if (isDev) {
    return '^https?:\\/\\/(?:(?:[a-zA-Z0-9-]+\\.)*atpassport\\.net|localhost:[0-9]+|127\\.0\\.0\\.1:[0-9]+)\\/api\\/fedcm\\/.*';
  }
  return '^https:\\/\\/(?:[a-zA-Z0-9-]+\\.)*atpassport\\.net\\/api\\/fedcm\\/.*';
}

/**
 * Generates the declarativeNetRequest rule for injecting Sec-Fetch-Dest: webidentity.
 */
export function createFedCmHeaderRule(isDev: boolean = false): chrome.declarativeNetRequest.Rule {
  return {
    id: FEDCM_HEADER_RULE_ID,
    priority: 1,
    action: {
      type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      requestHeaders: [
        {
          header: 'Sec-Fetch-Dest',
          operation: 'set' as chrome.declarativeNetRequest.HeaderOperation.SET,
          value: 'webidentity',
        },
      ],
    },
    condition: {
      regexFilter: getFedCmUrlRegex(isDev),
      resourceTypes: ['xmlhttprequest' as chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
    },
  };
}

/**
 * Registers the declarativeNetRequest rule for Firefox to inject Sec-Fetch-Dest: webidentity
 * on requests targeting AtPassport FedCM endpoints.
 * Uses atomic remove/add to ensure idempotence.
 */
export async function setupFedCmHeaderRule(): Promise<void> {
  // Only execute on Firefox
  if (import.meta.env.BROWSER !== 'firefox') {
    return;
  }

  const dnr =
    typeof browser !== 'undefined' && browser.declarativeNetRequest
      ? browser.declarativeNetRequest
      : typeof chrome !== 'undefined' && chrome.declarativeNetRequest
        ? chrome.declarativeNetRequest
        : null;

  if (!dnr?.updateDynamicRules) {
    console.warn('[AtPassport] declarativeNetRequest API is not available on this platform.');
    return;
  }

  const rule = createFedCmHeaderRule(import.meta.env.DEV);

  try {
    await dnr.updateDynamicRules({
      removeRuleIds: [FEDCM_HEADER_RULE_ID],
      addRules: [rule],
    });
    console.log('[AtPassport] FedCM declarativeNetRequest rule registered successfully.');
  } catch (error) {
    console.error('[AtPassport] Failed to register FedCM declarativeNetRequest rule:', error);
  }
}
