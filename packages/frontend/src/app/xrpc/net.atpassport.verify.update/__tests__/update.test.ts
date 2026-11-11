import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { getVerifiedDomainFromDb, verifyDomainInDb } from '@/lib/security';
import { resetRateLimit } from '@/lib/rate-limit';

vi.mock('@/lib/verify-service-auth');
vi.mock('@/lib/security');

describe('XRPC: net.atpassport.verify.update', () => {
  const mockDid = 'did:plc:user123';
  const domain = 'example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
  });

  it('should return 401 if unauthorized', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(null);
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.update', {
      method: 'POST',
      body: JSON.stringify({ domain, isPublic: true }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should return 400 if domain missing', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.update', {
      method: 'POST',
      body: JSON.stringify({ isPublic: true }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 403 if domain not owned by DID', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
      domain,
      verifiedByDid: 'did:plc:OTHER',
      status: 'approved',
      verifiedAt: '2023-01-01',
    });
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.update', {
      method: 'POST',
      body: JSON.stringify({ domain, isPublic: true }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it('should return 400 if policy url is invalid', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
      domain,
      verifiedByDid: mockDid,
      status: 'approved',
      verifiedAt: '2023-01-01',
    });
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.update', {
      method: 'POST',
      body: JSON.stringify({ domain, isPublic: true, privacyPolicyUrl: 'https://evil.com/privacy' }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('invalid_policy_url');
  });

  it('should update successfully when valid', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
      domain,
      verifiedByDid: mockDid,
      status: 'approved',
      verifiedAt: '2023-01-01',
      method: 'oauth',
    });
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.update', {
      method: 'POST',
      body: JSON.stringify({
        domain,
        isPublic: true,
        privacyPolicyUrl: 'https://example.com/privacy',
        termsOfServiceUrl: 'https://sub.example.com/terms',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(verifyDomainInDb).toHaveBeenCalledWith(domain, mockDid, true, 'oauth', {
      privacyPolicyUrl: 'https://example.com/privacy',
      termsOfServiceUrl: 'https://sub.example.com/terms',
    });
  });
});
