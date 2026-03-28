import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { verifyDomainInDb } from '@/lib/security';
import { resolveIdentity } from '@/lib/atproto-server';

vi.mock('@/lib/verify-service-auth');
vi.mock('@/lib/security');
vi.mock('@/lib/atproto-server');

describe('XRPC: net.atpassport.verify.submit', () => {
  const mockDid = 'did:plc:user123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should verify domain via OAuth (no domain in body)', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(resolveIdentity).mockResolvedValue({
      did: mockDid,
      handle: 'user.test',
      pdsUrl: 'https://pds.com'
    });

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({ isPublic: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(verifyDomainInDb).toHaveBeenCalledWith('user.test', mockDid, 'user.test', true, 'oauth');
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
    expect(verifyDomainInDb).toHaveBeenCalledWith(domain, mockDid, 'user.test', true, 'file');
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
    expect(data.error).toContain('Verification content mismatch');
    expect(verifyDomainInDb).not.toHaveBeenCalled();
  });

  it('should return 401 if unauthorized', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(null);

    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
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
    expect(data.error).toContain('Invalid domain format');
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
    expect(data.error).toContain('Connection failed');
  });

  it('should fail if identity not found for OAuth', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(mockDid);
    vi.mocked(resolveIdentity).mockResolvedValue(null);
    const request = new Request('https://example.com/xrpc/net.atpassport.verify.submit', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Identity not found');
  });
});
