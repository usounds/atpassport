import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { getVerifiedDomainsByDid } from '@/lib/security';
import { NextResponse } from 'next/server';

vi.mock('@/lib/verify-service-auth');
vi.mock('@/lib/security');
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server') as any;
  const mockNextResponse = vi.fn((body, init) => {
    return new actual.NextResponse(body, init);
  });
  (mockNextResponse as any).json = vi.fn((data, init) => {
    return actual.NextResponse.json(data, init);
  });
  return {
    ...actual,
    NextResponse: mockNextResponse,
  };
});

describe('XRPC: net.atpassport.verify.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if unauthorized', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(null);
    const request = new Request('http://localhost');
    const response = await GET(request);
    
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unauthorized' }),
      { status: 401 }
    );
  });

  it('should return list of domains if authorized', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue('did:plc:123');
    vi.mocked(getVerifiedDomainsByDid).mockResolvedValue([
      { domain: 'example.com', status: 'approved', verifiedAt: 'now', isPublic: 'true', method: 'oauth', verifiedByDid: 'did:plc:123' }
    ]);

    const request = new Request('http://localhost');
    await GET(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
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
    await GET(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Internal server error' }),
      { status: 500 }
    );
  });
});
