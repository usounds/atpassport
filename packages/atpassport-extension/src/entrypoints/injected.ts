export default defineUnlistedScript({
  include: ['firefox'],
  main() {
  const isNativeFedCm =
    typeof window !== 'undefined' &&
    'IdentityCredential' in window &&
    typeof navigator !== 'undefined' &&
    'credentials' in navigator &&
    typeof navigator.credentials?.get === 'function';

  // If native FedCM is not supported (such as in Firefox), provide polyfill
  if (!isNativeFedCm) {
    try {
      const doc = typeof document !== 'undefined'
        ? (document as Document & {
            permissionsPolicy?: { allowsFeature: (f: string) => boolean };
            featurePolicy?: { allowsFeature: (f: string) => boolean };
          })
        : undefined;
      const policy = doc?.permissionsPolicy || doc?.featurePolicy;
      if (policy && typeof policy.allowsFeature === 'function') {
        const origAllows = policy.allowsFeature.bind(policy);
        policy.allowsFeature = function (feature: string) {
          if (feature === 'identity-credentials-get') return true;
          return origAllows(feature);
        };
      }
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined' && !('IdentityCredential' in window)) {
      // Define dummy IdentityCredential class so feature checks pass
      (window as unknown as { IdentityCredential: unknown }).IdentityCredential = class IdentityCredential {};
    }

    if (typeof navigator !== 'undefined') {
      const nav = navigator as Navigator & {
        credentials?: CredentialsContainer;
      };

      if (!nav.credentials) {
        // Dummy credentials container if not present
        nav.credentials = {} as CredentialsContainer;
      }

      const originalGet = nav.credentials.get?.bind(nav.credentials);

      nav.credentials.get = async function (options?: CredentialRequestOptions) {
        // Check if this request is for AtPassport FedCM
        const identity = (options as unknown as { identity?: { providers?: Array<{ configURL?: string }> } })?.identity;
        const providers = identity?.providers;
        const isAtPassport = providers?.some(
          p => p.configURL && (p.configURL.includes('atpassport.net') || p.configURL.includes('/fedcm/config.json'))
        );

        if (!isAtPassport) {
          // If not AtPassport, delegate to original get if it existed
          if (originalGet) {
            return originalGet(options);
          }
          throw new DOMException('The operation is not supported.', 'NotSupportedError');
        }

        // Bridge to content script via CustomEvent
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            window.removeEventListener('atpassport-fedcm-response', responseListener as EventListener);
            reject(new DOMException('Request timed out.', 'AbortError'));
          }, 60000);

          const responseListener = (event: CustomEvent) => {
            if (event.detail?.requestId !== requestId) return;
            clearTimeout(timeoutId);
            window.removeEventListener('atpassport-fedcm-response', responseListener as EventListener);

            if (event.detail.error) {
              const errName = event.detail.error.name || 'AbortError';
              const errMsg = event.detail.error.message || 'The user aborted the request.';
              reject(new DOMException(errMsg, errName));
            } else {
              resolve({
                token: event.detail.token,
                type: 'identity',
              });
            }
          };

          window.addEventListener('atpassport-fedcm-response', responseListener as EventListener);

          window.dispatchEvent(
            new CustomEvent('atpassport-fedcm-request', {
              detail: {
                requestId,
                options,
              },
            })
          );
        });
      };
    }
  }
},
});
