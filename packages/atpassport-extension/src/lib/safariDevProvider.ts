import { getDefaultIdpOrigin } from './HandleManager';

/** Route mainnet requests to the configured IdP only in Safari development builds. */
export function resolveSafariDevProvider(provider: { configURL?: string; type?: string }) {
  if (import.meta.env.BROWSER !== 'safari' || import.meta.env.MODE !== 'development') {
    return provider;
  }
  const resolve = (value: string | undefined) => {
    if (!value) return value;
    try {
      const url = new URL(value);
      if (url.origin !== 'https://atpassport.net') return value;
      return `${new URL(getDefaultIdpOrigin()).origin}${url.pathname}${url.search}${url.hash}`;
    } catch {
      return value;
    }
  };
  return { ...provider, configURL: resolve(provider.configURL), type: resolve(provider.type) };
}
