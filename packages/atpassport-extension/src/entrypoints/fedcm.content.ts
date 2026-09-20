import { showFedCmPrompt } from '@/lib/fedcm-prompt';
import type { AccountItem } from '@/lib/HandleManager';

declare global {
  function exportFunction(
    func: unknown,
    targetScope: unknown,
    options?: { defineAs?: string; allowCrossOriginArguments?: boolean }
  ): unknown;
  function cloneInto<T>(
    obj: T,
    targetScope: unknown,
    options?: { cloneFunctions?: boolean; wrapReflectors?: boolean }
  ): T;
}

interface FedCmResponse {
  token: string;
  type: string;
}

const INLINE_POLYFILL_CODE = `
(function() {
  if (typeof window === 'undefined') return;
  console.log('[@passport] Main world FedCM polyfill loading on ' + window.location.href);

  // 1. IdentityCredential class
  if (!('IdentityCredential' in window)) {
    window.IdentityCredential = class IdentityCredential {};
    console.log('[@passport] IdentityCredential class defined');
  }

  // 2. Feature / Permissions Policy patch
  try {
    if (window.FeaturePolicy && window.FeaturePolicy.prototype) {
      var origFP = window.FeaturePolicy.prototype.allowsFeature;
      window.FeaturePolicy.prototype.allowsFeature = function(feature) {
        if (feature === 'identity-credentials-get') return true;
        return origFP ? origFP.call(this, feature) : false;
      };
    }
    if (window.PermissionsPolicy && window.PermissionsPolicy.prototype) {
      var origPP = window.PermissionsPolicy.prototype.allowsFeature;
      window.PermissionsPolicy.prototype.allowsFeature = function(feature) {
        if (feature === 'identity-credentials-get') return true;
        return origPP ? origPP.call(this, feature) : false;
      };
    }
    var doc = document;
    var policy = doc.permissionsPolicy || doc.featurePolicy;
    if (policy && typeof policy.allowsFeature === 'function') {
      var origAllows = policy.allowsFeature.bind(policy);
      policy.allowsFeature = function(feature) {
        if (feature === 'identity-credentials-get') return true;
        return origAllows(feature);
      };
    }
  } catch (e) {}

  // 3. navigator.credentials.get patch
  if (typeof navigator !== 'undefined') {
    if (!navigator.credentials) {
      navigator.credentials = {};
    }
    var nav = navigator;
    var origGet = nav.credentials.get ? nav.credentials.get.bind(nav.credentials) : null;

    var customGet = function(options) {
      console.log('[@passport] navigator.credentials.get called with:', options);
      var identity = options && options.identity;
      var providers = identity && identity.providers;
      var isAtPassport = providers && providers.some(function(p) {
        return p && p.configURL && (p.configURL.includes('atpassport.net') || p.configURL.includes('/fedcm/config.json'));
      });

      if (!isAtPassport) {
        console.log('[@passport] Not an AtPassport FedCM request, delegating to original');
        if (origGet) {
          return origGet(options);
        }
        return Promise.reject(new DOMException('The operation is not supported.', 'NotSupportedError'));
      }

      var requestId = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
      console.log('[@passport] Dispatching atpassport-fedcm-request, requestId:', requestId);
      return new Promise(function(resolve, reject) {
        var timeoutId = setTimeout(function() {
          cleanup();
          console.warn('[@passport] Request timed out for requestId:', requestId);
          reject(new DOMException('Request timed out.', 'AbortError'));
        }, 60000);

        function cleanup() {
          clearTimeout(timeoutId);
          window.removeEventListener('atpassport-fedcm-response', onResponse);
        }

        function onResponse(event) {
          try {
            var raw = event.detail;
            var data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!data || data.requestId !== requestId) return;
            cleanup();
            if (data.error) {
              reject(new DOMException(data.error.message || 'Error', data.error.name || 'AbortError'));
            } else {
              resolve({
                token: data.token,
                type: 'identity'
              });
            }
          } catch (e) {
            cleanup();
            reject(e);
          }
        }

        window.addEventListener('atpassport-fedcm-response', onResponse);

        var payload = JSON.stringify({ requestId: requestId, options: options });
        window.dispatchEvent(new CustomEvent('atpassport-fedcm-request', { detail: payload }));
      });
    };
    nav.credentials.get = customGet;
    if (window.CredentialsContainer && window.CredentialsContainer.prototype) {
      window.CredentialsContainer.prototype.get = customGet;
    }
    console.log('[@passport] navigator.credentials.get patched successfully');
  }
})();
`;

export default defineContentScript({
  include: ['firefox'],
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    console.log('[@passport] FedCM content script main() initialized on:', window.location.href);
    // Shared flow to fetch accounts via background and display the FedCM prompt
    const executeFedCmFlow = async (): Promise<FedCmResponse> => {
      console.log('[@passport] executeFedCmFlow requested');
      let accounts: AccountItem[] = [];
      try {
        const response = await browser.runtime.sendMessage({ type: 'FETCH_ACCOUNTS' });
        if (response?.success && Array.isArray(response.accounts)) {
          accounts = response.accounts;
        }
      } catch (err) {
        console.warn('[@passport] Error fetching accounts from background:', err);
      }

      console.debug('[@passport] Accounts retrieved for FedCM:', accounts?.length ?? 0);

      if (!accounts || accounts.length === 0) {
        throw new DOMException('No AtPassport accounts found or user is not logged in.', 'IdentityCredentialError');
      }

      const iconUrl = browser.runtime.getURL('/icons/icon48.png');

      return new Promise<FedCmResponse>((resolve, reject) => {
        showFedCmPrompt({
          accounts,
          iconUrl,
          rpDomain: window.location.hostname,
          onSelect: (selectedAccount) => {
            const cleanHandle = selectedAccount.handle.replace(/^@/, '');
            const did =
              selectedAccount.did ||
              `did:plc:${cleanHandle.replace(/[^a-zA-Z0-9]/g, '')}`;
            const token = JSON.stringify({
              v: 1,
              did,
              username: cleanHandle,
            });

            resolve({
              token,
              type: 'identity',
            });
          },
          onDismiss: () => {
            reject(new DOMException('User dismissed the credential manager.', 'AbortError'));
          },
        });
      });
    };

    // 1. Inject synchronous inline script into Main World
    try {
      const inlineScript = document.createElement('script');
      inlineScript.textContent = INLINE_POLYFILL_CODE;
      (document.head || document.documentElement).appendChild(inlineScript);
      inlineScript.remove();
    } catch (e) {
      console.debug('[@passport] Inline script injection skipped/failed:', e);
    }

    // 2. Also inject the external polyfill script tag as fallback
    try {
      const script = document.createElement('script');
      script.src = browser.runtime.getURL('/injected.js');
      script.async = false;
      (document.head || document.documentElement).appendChild(script);
      script.onload = () => script.remove();
    } catch (e) {
      console.debug('[@passport] Script tag injection fallback skipped/failed:', e);
    }

    // 3. Listen for CustomEvent FedCM requests (bridge for injected scripts or web pages)
    const processedRequests = new Set<string>();

    const handleCustomEvent = async (event: Event) => {
      const customEvent = event as CustomEvent<string | { requestId: string; options?: unknown }>;
      let data: { requestId: string; options?: unknown } | null = null;
      try {
        const raw = customEvent.detail;
        data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return;
      }

      const requestId = data?.requestId;
      if (!requestId || processedRequests.has(requestId)) return;
      processedRequests.add(requestId);
      console.log('[@passport] Content script received atpassport-fedcm-request, requestId:', requestId);

      const respond = (detail: { requestId: string; token?: string; error?: { name: string; message: string } }) => {
        const payload = JSON.stringify(detail);
        window.dispatchEvent(
          new CustomEvent('atpassport-fedcm-response', {
            detail: payload,
          })
        );
      };

      try {
        const result = await executeFedCmFlow();
        respond({
          requestId,
          token: result.token,
        });
      } catch (err) {
        const errName = (err && typeof err === 'object' && 'name' in err) ? String(err.name) : 'IdentityCredentialError';
        const errMsg = (err && typeof err === 'object' && 'message' in err) ? String(err.message) : 'Failed to retrieve accounts.';
        respond({
          requestId,
          error: {
            name: errName,
            message: errMsg,
          },
        });
      }
    };

    window.addEventListener('atpassport-fedcm-request', handleCustomEvent);
  },
});
