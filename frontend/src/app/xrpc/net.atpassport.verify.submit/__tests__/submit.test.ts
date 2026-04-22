import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { verifyDomainInDb } from '@/lib/security';
import { resolveIdentity } from '@/lib/atproto-server';
import { resetRateLimit } from '@/lib/rate-limit';

vi.mock('@/lib/verify-service-auth');
vi.mock('@/lib/security');
vi.mock('@/lib/atproto-server');

describe('XRPC: net.atpassport.verify.submit', () => {
  const mockDid = 'did:plc:user123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    resetRateLimit();
  });

  it('should verify domain via OAuth (domain matches handle)', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(resolveIdentity).mockResolvedValue({
      did: mockDid,
      handle: 'user.test',
      pdsUrl: 'https://pds.com'
    });

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({ domain: 'user.test', isPublic: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(verifyDomainInDb).toHaveBeenCalledWith('user.test', mockDid, true, 'oauth');
  });

  it('should fail if domain is missing', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({ isPublic: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('invalid_request');
    expect(data.message).toContain('Domain is required');
  });

  it('should verify domain via File (domain in body)', async () => {
    const domain = 'custom-domain.com';
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(resolveIdentity).mockResolvedValue({
      did: mockDid,
      handle: 'user.test',
      pdsUrl: 'https://pds.com'
    });

    // Mock successful fetch of .well-known/atpassport
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => `atpassport-verification: ${mockDid}`,
    } as Response);

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({ domain, isPublic: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(verifyDomainInDb).toHaveBeenCalledWith(domain, mockDid, true, 'file');
    expect(fetch).toHaveBeenCalledWith(`https://${domain}/.well-known/atpassport`, expect.any(Object));
  });

  it('should fail if file content does not match', async () => {
    const domain = 'wrong-domain.com';
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: async () => `atpassport-verification: did:plc:WRONG`,
    } as Response);

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toBe('verification_mismatch');
    expect(verifyDomainInDb).not.toHaveBeenCalled();
  });

  it('should return 401 if unauthorized', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(null);

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('should fail if domain format is invalid', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({ domain: 'invalid' }),
    });
    const response = await POST(request);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('invalid_request');
    expect(data.message).toContain('Invalid domain format');
  });

  it('should fail if fetch throws error', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(fetch).mockRejectedValue(new Error('Network Error'));
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({ domain: 'fail.com' }),
    });
    const response = await POST(request);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('connection_failed');
  });

  it('should fail if domain is localhost or IP address', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    
    const testCases = ['localhost', '127.0.0.1', '192.168.1.1', '8.8.8.8', '::1', '2001:db8::1'];
    
    for (const domain of testCases) {
      resetRateLimit(); // Reset rate limit for each test case in the loop
      const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
        method: 'POST',
        body: JSON.stringify({ domain }),
      });
      const response = await POST(request);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('invalid_request');
      expect(response.status).toBe(400);
    }
  });

  it('should trigger rate limiting after multiple requests', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    
    // Perform 5 requests (the limit)
    for (let i = 0; i < 5; i++) {
      const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
        method: 'POST',
        body: JSON.stringify({ isPublic: true }),
      });
      const response = await POST(request);
      expect(response.status).not.toBe(429);
    }

    // The 6th request should be rate limited
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({ isPublic: true }),
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(429);
    expect(data.error).toBe('rate_limited');
    expect(data.message).toContain('Too many requests');
  });

  it('should fail if identity not found for OAuth', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(resolveIdentity).mockResolvedValue(null);
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({ domain: 'user.test' }),
    });
    const response = await POST(request);
    const data = await response.json();
    // In this case, since resolution fails, it proceeds to Case B (File)
    // but fetch is not mocked for this case, or it should fail domain resolution.
    // Actually, looking at route.ts:
    // identity is null, so it continues to Case B
    // Case B for 'user.test' will try to fetch 'https://user.test/.well-known/atpassport'
    expect(data.success).toBe(false);
  });

  it('should fail if fetch response is not ok', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({ domain: 'notfound.com' }),
    });

    const response = await POST(request);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('unreachable_url');
  });

  it('should return 500 if an unexpected error occurs', async () => {
    vi.mocked(verifyServiceAuth).mockRejectedValue(new Error('Fatal Server Error'));
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
