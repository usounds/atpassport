import { describe, it, expect } from 'vitest';
import { createContentSecurityPolicy } from '../csp';

describe('createContentSecurityPolicy', () => {
  it('generates a restrictive policy in production with HTTPS', () => {
    const nonce = 'test-nonce-123';
    const policy = createContentSecurityPolicy(nonce, false, true);

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'nonce-test-nonce-123' 'strict-dynamic'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'none'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain('upgrade-insecure-requests');
    expect(policy).toContain('https://embed.bsky.app');
    expect(policy).toContain("style-src 'self' 'nonce-test-nonce-123'");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    expect(policy.split('; ').find((part) => part.startsWith('connect-src '))!.split(' ')).not.toContain('https:');
  });

  it('limits arbitrary HTTPS to browser OAuth entry and callback pages', () => {
    for (const path of ['/de/developers/verify', '/en/developers/verify/callback', '/developers/verify', '/developers']) {
      expect(createContentSecurityPolicy('nonce', false, true, path).split('; ').find((part) => part.startsWith('connect-src '))!.split(' ')).toContain('https:');
    }
    for (const path of ['/de', '/de/developers/guide', '/de/developers/verify-other']) {
      expect(createContentSecurityPolicy('nonce', false, true, path).split('; ').find((part) => part.startsWith('connect-src '))!.split(' ')).not.toContain('https:');
    }
  });

  it('allows unsafe-eval only in development mode', () => {
    const nonce = 'dev-nonce-456';
    const policy = createContentSecurityPolicy(nonce, true, false);

    expect(policy).toContain("'unsafe-eval'");
    expect(policy).not.toContain('upgrade-insecure-requests');
  });
});
