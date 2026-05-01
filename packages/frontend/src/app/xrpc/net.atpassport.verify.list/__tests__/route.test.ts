import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { getVerifiedDomainsByDid } from '@/lib/security';

vi.mock('@/lib/verify-service-auth');
vi.mock('@/lib/security');

describe('XRPC: net.atpassport.verify.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if unauthorized', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(null);
    const request = new Request('http://localhost');
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'Unauthorized' }));
  });

  it('should return list of domains if authorized', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue('did:plc:123');
    vi.mocked(getVerifiedDomainsByDid).mockResolvedValue([
      { domain: 'example.com', status: 'approved', verifiedAt: 'now', isPublic: 'true', method: 'oauth', verifiedByDid: 'did:plc:123' }
    ]);

    const request = new Request('http://localhost');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        success: true,
        domains: expect.arrayContaining([
          expect.objectContaining({ domain: 'example.com', isPublic: true })
        ])
      })
    );
  });

  it('should return 500 if error occurs', async () => {
    vi.mocked(verifyServiceAuth).mockRejectedValue(new Error('Fatal'));
    const request = new Request('http://localhost');
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'Internal server error' }));
  });
});
