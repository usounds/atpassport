/**
 * Safely determines whether a given FedCM configURL belongs to AtPassport.
 * Protects against incomplete URL substring sanitization vulnerabilities.
 */
export function isAtPassportConfigUrl(configURL: unknown): boolean {
  if (typeof configURL !== 'string' || !configURL.trim()) {
    return false;
  }

  try {
    const base = typeof window !== 'undefined' && window.location ? window.location.href : undefined;
    const url = new URL(configURL, base);

    const hostname = url.hostname.toLowerCase();
    const isLoopback =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]';

    if (isLoopback) {
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return false;
      }
    } else {
      if (url.protocol !== 'https:') {
        return false;
      }
      const isAtPassportDomain =
        hostname === 'atpassport.net' ||
        hostname.endsWith('.atpassport.net');

      if (!isAtPassportDomain) {
        return false;
      }
    }

    return url.pathname === '/fedcm/config.json';
  } catch {
    return false;
  }
}
