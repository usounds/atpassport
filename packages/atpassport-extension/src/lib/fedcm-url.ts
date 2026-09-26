/**
 * Safely determines whether a given origin or URL belongs to AtPassport.
 * Supports production, subdomains, and local development loopback origins.
 */
export function isAtPassportOrigin(originOrUrl: unknown): boolean {
  if (typeof originOrUrl !== 'string' || !originOrUrl.trim()) {
    return false;
  }
  try {
    const base = typeof window !== 'undefined' && window.location ? window.location.href : undefined;
    const url = new URL(originOrUrl, base);
    const hostname = url.hostname.toLowerCase();
    const isLoopback =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '[::1]';

    if (isLoopback) {
      return url.protocol === 'http:' || url.protocol === 'https:';
    }
    if (url.protocol !== 'https:') {
      return false;
    }
    return hostname === 'atpassport.net' || hostname.endsWith('.atpassport.net');
  } catch {
    return false;
  }
}

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

    if (!isAtPassportOrigin(url.origin)) {
      return false;
    }

    return url.pathname === '/fedcm/config.json';
  } catch {
    return false;
  }
}

