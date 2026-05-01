import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { getVerifiedDomainFromDb, deleteVerifiedDomainFromDb } from '@/lib/security';
import { isRateLimited } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

vi.mock('@/lib/verify-service-auth');
vi.mock('@/lib/security');
vi.mock('@/lib/rate-limit');
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

describe('XRPC: net.atpassport.verify.withdraw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if unauthorized', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(null);
    const request = new Request('http://localhost', { method: 'POST' });
    await POST(request);
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Unauthorized') }),
      { status: 401 }
    );
  });

  it('should return 429 if rate limited', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue('did:plc:123');
    vi.mocked(isRateLimited).mockReturnValue(true);
    const request = new Request('http://localhost', { method: 'POST' });
    await POST(request);
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Too many requests') }),
      { status: 429 }
    );
  });

  it('should return 400 if domain missing', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue('did:plc:123');
    vi.mocked(isRateLimited).mockReturnValue(false);
    const request = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) });
    await POST(request);
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Missing domain to withdraw' }),
      { status: 400 }
    );
  });

  it('should return 403 if unauthorized or not found', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue('did:plc:123');
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue(null);
    
    const request = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ domain: 'test.com' }) });
    await POST(request);
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unauthorized or domain not found' }),
      { status: 403 }
    );
  });

  it('should withdraw successfully', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue('did:plc:123');
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({ domain: 'test.com', verifiedByDid: 'did:plc:123' } as any);
    
    const request = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ domain: 'test.com' }) });
    await POST(request);
    
    expect(deleteVerifiedDomainFromDb).toHaveBeenCalledWith('test.com');
    expect(NextResponse.json).toHaveBeenCalledWith({ success: true });
  });

  it('should return 500 if error occurs', async () => {
    vi.mocked(verifyServiceAuth).mockRejectedValue(new Error('Fatal'));
    const request = new Request('http://localhost', { method: 'POST' });
    await POST(request);
    expect(NextResponse.json).toHaveBeenCalledWith({ success: false, error: 'Internal server error' }, { status: 500 });
  });
});
