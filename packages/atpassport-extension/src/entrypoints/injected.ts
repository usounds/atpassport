import { isAtPassportConfigUrl } from '@/lib/fedcm-url';

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
        const isAtPassport = providers?.some(p => isAtPassportConfigUrl(p?.configURL));

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
            let data = event.detail;
            if (typeof data === 'string') {
              try {
                data = JSON.parse(data);
              } catch {
                return;
              }
            }
            if (!data || data.requestId !== requestId) return;
            clearTimeout(timeoutId);
            window.removeEventListener('atpassport-fedcm-response', responseListener as EventListener);

            if (data.error) {
              const errName = data.error.name || 'AbortError';
              const errMsg = data.error.message || 'The user aborted the request.';
              reject(new DOMException(errMsg, errName));
            } else {
              resolve({
                token: data.token,
                type: 'identity',
              } as unknown as Credential);
            }
          };

          window.addEventListener('atpassport-fedcm-response', responseListener as EventListener);

          window.dispatchEvent(
            new CustomEvent('atpassport-fedcm-request', {
              detail: JSON.stringify({
                requestId,
                options,
              }),
            })
          );
        });
      };
    }

    try {
      if (typeof navigator !== 'undefined') {
        const navProto = Object.getPrototypeOf(navigator) || (typeof Navigator !== 'undefined' ? Navigator.prototype : null);
        const origSetStatus = (navigator as unknown as { login?: { setStatus?: unknown } })?.login?.setStatus;
        const origSetStatusFn = typeof origSetStatus === 'function' ? origSetStatus.bind((navigator as any).login) : null;

        const loginObj = {
          setStatus: async function (status: string, options?: unknown) {
            const requestId = `status_${Math.random().toString(36).slice(2)}${Date.now()}`;

            const savePromise = new Promise<void>((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                window.removeEventListener('atpassport-fedcm-setstatus-response', responseHandler as EventListener);
                reject(new Error('Account storage acknowledgement timed out'));
              }, 3000);

              const responseHandler = (e: CustomEvent) => {
                try {
                  const raw = e.detail;
                  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
                  if (data && data.requestId === requestId) {
                    clearTimeout(timeoutId);
                    window.removeEventListener('atpassport-fedcm-setstatus-response', responseHandler as EventListener);
                    if (data.success) {
                      resolve();
                    } else {
                      reject(new Error(data.error || 'Failed to save pushed accounts in extension'));
                    }
                  }
                } catch {
                  // ignore
                }
              };

              window.addEventListener('atpassport-fedcm-setstatus-response', responseHandler as EventListener);

              try {
                window.dispatchEvent(
                  new CustomEvent('atpassport-fedcm-setstatus', {
                    detail: JSON.stringify({ requestId, status, options }),
                  })
                );
              } catch {
                clearTimeout(timeoutId);
                window.removeEventListener('atpassport-fedcm-setstatus-response', responseHandler as EventListener);
                reject(new Error('Failed to dispatch account storage request'));
              }
            });

            await savePromise;

            if (origSetStatusFn) {
              try {
                return await origSetStatusFn(status, options);
              } catch {
                return;
              }
            }
          },
        };

        if (navProto) {
          try {
            Object.defineProperty(navProto, 'login', {
              get: () => loginObj,
              configurable: true,
              enumerable: true,
            });
          } catch {
            try { (navigator as any).login = loginObj; } catch {}
          }
        } else {
          try { (navigator as any).login = loginObj; } catch {}
        }
      }
    } catch {
      // ignore
    }
  }
},
});

