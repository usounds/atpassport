import { describe, it, expect } from 'vitest';
import { isAtPassportConfigUrl, isAtPassportOrigin } from '../fedcm-url';

describe('isAtPassportOrigin', () => {
  it('should accept valid production and subdomain origins', () => {
    expect(isAtPassportOrigin('https://atpassport.net')).toBe(true);
    expect(isAtPassportOrigin('https://dev.atpassport.net')).toBe(true);
    expect(isAtPassportOrigin('https://staging.atpassport.net')).toBe(true);
  });

  it('should accept local loopback origins', () => {
    expect(isAtPassportOrigin('http://localhost:3000')).toBe(true);
    expect(isAtPassportOrigin('http://localhost')).toBe(true);
    expect(isAtPassportOrigin('https://localhost:3000')).toBe(true);
    expect(isAtPassportOrigin('http://127.0.0.1:3000')).toBe(true);
    expect(isAtPassportOrigin('http://0.0.0.0:3000')).toBe(true);
    expect(isAtPassportOrigin('http://[::1]:3000')).toBe(true);
  });

  it('should reject attacker domains and invalid protocols', () => {
    expect(isAtPassportOrigin('https://atpassport.net.attacker.com')).toBe(false);
    expect(isAtPassportOrigin('https://evil-atpassport.net')).toBe(false);
    expect(isAtPassportOrigin('http://atpassport.net')).toBe(false);
    expect(isAtPassportOrigin('https://example.com')).toBe(false);
    expect(isAtPassportOrigin('')).toBe(false);
    expect(isAtPassportOrigin(null)).toBe(false);
  });
});

describe('isAtPassportConfigUrl', () => {
  it('should accept valid atpassport.net production config URLs', () => {
    expect(isAtPassportConfigUrl('https://atpassport.net/fedcm/config.json')).toBe(true);
    expect(isAtPassportConfigUrl('https://atpassport.net/fedcm/config.json?v=1')).toBe(true);
  });

  it('should accept valid atpassport.net subdomains', () => {
    expect(isAtPassportConfigUrl('https://dev.atpassport.net/fedcm/config.json')).toBe(true);
    expect(isAtPassportConfigUrl('https://preview.atpassport.net/fedcm/config.json')).toBe(true);
    expect(isAtPassportConfigUrl('https://staging.atpassport.net/fedcm/config.json')).toBe(true);
  });

  it('should accept local development URLs', () => {
    expect(isAtPassportConfigUrl('http://localhost:3000/fedcm/config.json')).toBe(true);
    expect(isAtPassportConfigUrl('http://localhost/fedcm/config.json')).toBe(true);
    expect(isAtPassportConfigUrl('https://localhost:3000/fedcm/config.json')).toBe(true);
    expect(isAtPassportConfigUrl('http://127.0.0.1:3000/fedcm/config.json')).toBe(true);
    expect(isAtPassportConfigUrl('http://0.0.0.0:3001/fedcm/config.json')).toBe(true);
    expect(isAtPassportConfigUrl('http://[::1]:3000/fedcm/config.json')).toBe(true);
  });

  it('should reject attacker domains that contain atpassport.net substring', () => {
    expect(isAtPassportConfigUrl('https://atpassport.net.attacker.com/fedcm/config.json')).toBe(false);
    expect(isAtPassportConfigUrl('https://evil-atpassport.net/fedcm/config.json')).toBe(false);
    expect(isAtPassportConfigUrl('https://atpassport.netevil.com/fedcm/config.json')).toBe(false);
    expect(isAtPassportConfigUrl('https://attacker.com/atpassport.net/fedcm/config.json')).toBe(false);
    expect(isAtPassportConfigUrl('https://attacker.com/?q=atpassport.net')).toBe(false);
    expect(isAtPassportConfigUrl('https://atpassport.net@attacker.com/fedcm/config.json')).toBe(false);
  });

  it('should reject non-atpassport providers even if path is /fedcm/config.json', () => {
    expect(isAtPassportConfigUrl('https://accounts.google.com/fedcm/config.json')).toBe(false);
    expect(isAtPassportConfigUrl('https://example.com/fedcm/config.json')).toBe(false);
    expect(isAtPassportConfigUrl('https://evil.org/fedcm/config.json')).toBe(false);
  });

  it('should reject insecure HTTP for remote domains', () => {
    expect(isAtPassportConfigUrl('http://atpassport.net/fedcm/config.json')).toBe(false);
    expect(isAtPassportConfigUrl('http://dev.atpassport.net/fedcm/config.json')).toBe(false);
  });

  it('should reject wrong paths on atpassport.net', () => {
    expect(isAtPassportConfigUrl('https://atpassport.net/')).toBe(false);
    expect(isAtPassportConfigUrl('https://atpassport.net/api/fedcm/accounts')).toBe(false);
    expect(isAtPassportConfigUrl('https://atpassport.net/other.json')).toBe(false);
  });

  it('should reject invalid or non-string inputs', () => {
    expect(isAtPassportConfigUrl('')).toBe(false);
    expect(isAtPassportConfigUrl('   ')).toBe(false);
    expect(isAtPassportConfigUrl(null)).toBe(false);
    expect(isAtPassportConfigUrl(undefined)).toBe(false);
    expect(isAtPassportConfigUrl(12345)).toBe(false);
    expect(isAtPassportConfigUrl('not-a-url')).toBe(false);
  });
});

