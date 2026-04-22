import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { getVerifiedDomainFromDb, deleteVerifiedDomainFromDb } from '@/lib/security';
import { resetRateLimit } from '@/lib/rate-limit';

vi.mock('@/lib/verify-service-auth');
vi.mock('@/lib/security');

describe('XRPC: net.atpassport.verify.withdraw', () => {
  const mockDid = 'did:plc:user123';
  const domain = 'verify.com';

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
  });

  it('should trigger rate limiting after multiple requests', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    
    // Perform 10 requests (the limit)
    for (let i = 0; i < 10; i++) {
      const request = new Request('https://example.com/xrpc/net.atpassport.verify.withdraw', {
        method: 'POST',
        body: JSON.stringify({ domain: `domain${i}.com` }),
      });
      const response = await POST(request);
      expect(response.status).not.toBe(429);
    }

    // The 11th request should be rate limited
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.withdraw', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
    const response = await POST(request);
    const data = await response.json();
    expect(response.status).toBe(429);
    expect(data.error).toContain('Too many requests');
  });

  it('should withdraw a domain if user is the owner', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
      domain: domain,
      verifiedByDid: mockDid,
      handle: 'user.test',
      status: 'approved',
      verifiedAt: '2023-01-01',
    });

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.withdraw', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(deleteVerifiedDomainFromDb).toHaveBeenCalledWith(domain);
  });

  it('should fail if user is not the owner', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
      domain: domain,
      verifiedByDid: 'did:plc:OTHER',
      handle: 'other.test',
      status: 'approved',
      verifiedAt: '2023-01-01',
    });

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.withdraw', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error).toContain('Unauthorized');
    expect(deleteVerifiedDomainFromDb).not.toHaveBeenCalled();
  });

  it('should return 401 if unauthorized', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(null);

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.withdraw', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
