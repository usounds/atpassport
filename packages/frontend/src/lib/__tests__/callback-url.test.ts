import { describe, expect, it } from 'vitest';
import { getCallbackUrlError, isAllowedCallbackUrl } from '../callback-url';

describe('callback-url', () => {
  it('allows HTTPS callbacks', () => {
    expect(isAllowedCallbackUrl('https://app.example/callback')).toBe(true);
    expect(getCallbackUrlError('https://app.example/callback')).toBeNull();
  });

  it('allows HTTP loopback callbacks', () => {
    expect(isAllowedCallbackUrl('http://localhost:3000/callback')).toBe(true);
    expect(isAllowedCallbackUrl('http://127.0.0.1:3000/callback')).toBe(true);
    expect(isAllowedCallbackUrl('http://app.localhost:3000/callback')).toBe(true);
  });

  it('rejects non-HTTPS non-loopback callbacks', () => {
    expect(isAllowedCallbackUrl('http://example.com/callback')).toBe(false);
    expect(getCallbackUrlError('http://example.com/callback')).toBe('Invalid callback URL: HTTPS is required');
  });

  it('rejects invalid or script callbacks', () => {
    expect(isAllowedCallbackUrl('javascript:alert(1)')).toBe(false);
    expect(getCallbackUrlError('javascript:alert(1)')).toBe('Invalid callback URL: HTTPS is required');
    expect(isAllowedCallbackUrl('not a url')).toBe(false);
    expect(getCallbackUrlError('not a url')).toBe('Invalid callback URL');
  });
});
