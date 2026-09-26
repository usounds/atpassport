import { showFedCmPrompt } from '@/lib/fedcm-prompt';
import { getDefaultIdpOrigin, type AccountItem } from '@/lib/HandleManager';
import { isAtPassportOrigin, isAtPassportConfigUrl } from '@/lib/fedcm-url';
import type { StoredAccount } from '@/lib/accountStorage';

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
      function isAtPassportConfigUrl(configURL) {
        if (!configURL || typeof configURL !== 'string') return false;
        try {
          var url = new URL(configURL, window.location.href);
          var hostname = url.hostname.toLowerCase();
          var isLoopback =
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname === '[::1]';

          if (isLoopback) {
            if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
          } else {
            if (url.protocol !== 'https:') return false;
            var isAtPassportDomain =
              hostname === 'atpassport.net' ||
              hostname.endsWith('.atpassport.net');
            if (!isAtPassportDomain) return false;
          }

          return url.pathname === '/fedcm/config.json';
        } catch (e) {
          return false;
        }
      }

      var isAtPassport = providers && providers.some(function(p) {
        return p && isAtPassportConfigUrl(p.configURL);
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

  // 4. navigator.login.setStatus patch
  try {
    if (typeof navigator !== 'undefined') {
      var navProto = Object.getPrototypeOf(navigator) || (typeof Navigator !== 'undefined' ? Navigator.prototype : null);
      var origSetStatus = (navigator.login && typeof navigator.login.setStatus === 'function')
        ? navigator.login.setStatus.bind(navigator.login)
        : null;

      var loginObj = {
        setStatus: function(status, options) {
          try {
            console.log('[@passport Polyfill] navigator.login.setStatus called:', status, options);
            window.dispatchEvent(new CustomEvent('atpassport-fedcm-setstatus', {
              detail: JSON.stringify({ status: status, options: options })
            }));
          } catch (e) {
            console.warn('[@passport Polyfill] setStatus dispatch error:', e);
          }

          if (origSetStatus) {
            try {
              return origSetStatus(status, options);
            } catch (e) {
              return Promise.resolve();
            }
          }
          return Promise.resolve();
        }
      };

      if (navProto) {
        try {
          Object.defineProperty(navProto, 'login', {
            get: function() { return loginObj; },
            configurable: true,
            enumerable: true,
          });
        } catch (e) {
          try { navigator.login = loginObj; } catch (e2) {}
        }
      } else {
        try { navigator.login = loginObj; } catch (e) {}
      }
      console.log('[@passport] navigator.login.setStatus patched successfully');
    }
  } catch (e) {}
})();
`;

export default defineContentScript({
  include: ['firefox'],
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    console.log('[@passport] FedCM content script main() initialized on:', window.location.href);

    // Shared flow to fetch accounts via background and display the FedCM prompt
    const executeFedCmFlow = async (options?: unknown): Promise<FedCmResponse> => {
      console.log('[@passport] executeFedCmFlow requested with options:', options);

      // 1. Identify target IdP configURL and origin
      const identity = (options as { identity?: { providers?: Array<{ configURL?: string }> } })?.identity;
      const provider = identity?.providers?.[0];
      const defaultOrigin = getDefaultIdpOrigin();
      const configURL = provider?.configURL || `${defaultOrigin}/fedcm/config.json`;

      let idpOrigin = defaultOrigin;
      try {
        idpOrigin = new URL(configURL, window.location.href).origin;
      } catch {
        // fallback
      }

      // 2. Fetch accounts: First try stored accounts for this IdP origin
      let accounts: AccountItem[] = [];
      try {
        const storedRes = await browser.runtime.sendMessage({
          type: 'GET_STORED_ACCOUNTS',
          origin: idpOrigin,
        });
        console.log('[@passport] GET_STORED_ACCOUNTS response:', storedRes);
        if (storedRes?.success && Array.isArray(storedRes.accounts) && storedRes.accounts.length > 0) {
          accounts = storedRes.accounts.map((acc: StoredAccount) => ({
            handle: acc.username.startsWith('@') ? acc.username : `@${acc.username}`,
            displayName: acc.name,
            avatar: acc.picture,
            did: acc.id,
          }));
          console.log('[@passport] Using', accounts.length, 'pushed accounts from extension storage (Zero-Network hit!):', accounts);
        }
      } catch (err) {
        console.warn('[@passport] Error getting stored accounts from background:', err);
      }

      // 3. Fallback to FETCH_ACCOUNTS if stored accounts are empty
      if (accounts.length === 0) {
        console.warn('[@passport] No pushed accounts found in extension storage. Falling back to network FETCH_ACCOUNTS (/api/fedcm/accounts)...');
        try {
          const response = await browser.runtime.sendMessage({
            type: 'FETCH_ACCOUNTS',
            origin: idpOrigin,
          });
          if (response?.success && Array.isArray(response.accounts)) {
            accounts = response.accounts;
          }
        } catch (err) {
          console.warn('[@passport] Error fetching accounts from background fallback:', err);
        }
      }

      console.debug('[@passport] Accounts retrieved for FedCM:', accounts?.length ?? 0);

      if (!accounts || accounts.length === 0) {
        throw new DOMException('No AtPassport accounts found or user is not logged in.', 'IdentityCredentialError');
      }

      const iconUrl = browser.runtime.getURL('/icons/icon48.png');

      let flowResolve!: (val: FedCmResponse) => void;
      let flowReject!: (reason: unknown) => void;
      const flowPromise = new Promise<FedCmResponse>((res, rej) => {
        flowResolve = res;
        flowReject = rej;
      });

      showFedCmPrompt({
        accounts,
        iconUrl,
        rpDomain: window.location.hostname,
        onSelect: async (selectedAccount) => {
          console.log('[@passport] onSelect callback invoked for account:', selectedAccount);
          try {
            const accountId = selectedAccount.did || selectedAccount.handle.replace(/^@/, '');
            console.log('[@passport] Delegating assertion to background, accountId:', accountId, 'clientId:', window.location.origin);

            const res = await browser.runtime.sendMessage({
              type: 'EXECUTE_ASSERTION',
              origin: idpOrigin,
              clientId: window.location.origin,
              accountId,
            });

            console.log('[@passport] Background assertion response:', res);
            if (!res?.success || !res?.token) {
              const errorDetail = res?.error || 'Failed to retrieve assertion token';
              console.warn('[@passport] Assertion failed in background:', errorDetail);
              throw new DOMException(errorDetail, 'NetworkError');
            }

            console.log('[@passport] Assertion succeeded, received token');
            flowResolve({
              token: res.token,
              type: 'identity',
            });
          } catch (err) {
            console.error('[@passport] FedCM assertion request failed:', err);
            if (err instanceof DOMException) {
              flowReject(err);
            } else {
              flowReject(
                new DOMException(
                  err instanceof Error ? err.message : 'Failed to retrieve assertion token',
                  'NetworkError'
                )
              );
            }
          }
        },
        onDismiss: () => {
          console.log('[@passport] Prompt dismissed by user');
          flowReject(new DOMException('User dismissed the credential manager.', 'AbortError'));
        },
      });

      return flowPromise;
    };

    // 1. Inject synchronous inline script into Main World
    let inlineInjected = false;
    try {
      const inlineScript = document.createElement('script');
      inlineScript.textContent = INLINE_POLYFILL_CODE;
      const target = document.head || document.documentElement;
      if (target) {
        target.appendChild(inlineScript);
        inlineScript.remove();
        inlineInjected = true;
      }
    } catch (e) {
      console.debug('[@passport] Inline script injection skipped/failed:', e);
    }

    // 2. Also inject the external polyfill script tag only as fallback if inline failed
    if (!inlineInjected) {
      try {
        const script = document.createElement('script');
        script.src = browser.runtime.getURL('/injected.js');
        script.async = false;
        const target = document.head || document.documentElement;
        if (target) {
          target.appendChild(script);
          script.onload = () => script.remove();
        }
      } catch (e) {
        console.debug('[@passport] Script tag injection fallback skipped/failed:', e);
      }
    }

    // 3. Listen for Accounts Push events from AtPassport Web
    window.addEventListener('atpassport-fedcm-setstatus', async (event: Event) => {
      console.log('[@passport ContentScript] Received atpassport-fedcm-setstatus event on:', window.location.origin);
      try {
        // Only accept push events if currently running on an AtPassport origin
        if (!isAtPassportOrigin(window.location.origin)) {
          console.log('[@passport ContentScript] Ignored setstatus: not an AtPassport origin:', window.location.origin);
          return;
        }

        const customEvent = event as CustomEvent<string | { status: string; options?: { accounts?: StoredAccount[] } }>;
        let detail: { status: string; options?: { accounts?: StoredAccount[] } } | null = null;
        try {
          const raw = customEvent.detail;
          detail = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          return;
        }

        if (!detail || typeof detail.status !== 'string') return;

        // 1. If status is 'logged-out', clear pushed accounts
        if (detail.status === 'logged-out') {
          console.log('[@passport ContentScript] User logged out, clearing pushed accounts');
          const res = await browser.runtime.sendMessage({
            type: 'SAVE_PUSHED_ACCOUNTS',
            origin: window.location.origin,
            accounts: [],
          });
          console.log('[@passport ContentScript] Clear accounts response:', res);
          return;
        }

        // 2. If status is 'logged-in', ONLY update stored accounts if options.accounts was explicitly provided!
        if (detail.status === 'logged-in') {
          if (!detail.options || !Array.isArray(detail.options.accounts)) {
            console.log('[@passport ContentScript] Baseline setStatus("logged-in") without accounts received. Preserving existing stored accounts.');
            return;
          }

          const accounts = detail.options.accounts;
          console.log('[@passport ContentScript] Sending SAVE_PUSHED_ACCOUNTS to background:', {
            origin: window.location.origin,
            accountsCount: accounts.length,
          });

          const res = await browser.runtime.sendMessage({
            type: 'SAVE_PUSHED_ACCOUNTS',
            origin: window.location.origin,
            accounts,
          });
          console.log('[@passport ContentScript] SAVE_PUSHED_ACCOUNTS response from background:', res);
        }
      } catch (err) {
        console.warn('[@passport ContentScript] Failed to process atpassport-fedcm-setstatus:', err);
      }
    });

    // 4. Listen for CustomEvent FedCM requests (bridge for injected scripts or web pages)
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
      if (!data || !requestId || processedRequests.has(requestId)) return;
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
        const result = await executeFedCmFlow(data.options);
        respond({
          requestId,
          token: result.token,
        });
      } catch (err) {
        const errName = (err && typeof err === 'object' && 'name' in err) ? String((err as { name?: string }).name) : 'IdentityCredentialError';
        const errMsg = (err && typeof err === 'object' && 'message' in err) ? String((err as { message?: string }).message) : 'Failed to retrieve accounts.';
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

