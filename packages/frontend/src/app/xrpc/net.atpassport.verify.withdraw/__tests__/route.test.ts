import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { getVerifiedDomainFromDb, deleteVerifiedDomainFromDb } from '@/lib/security';
import { isRateLimited } from '@/lib/rate-limit';

vi.mock('@/lib/verify-service-auth');
vi.mock('@/lib/security');
vi.mock('@/lib/rate-limit');

describe('XRPC: net.atpassport.verify.withdraw', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if unauthorized', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue(null);
    const request = new Request('http://localhost', { method: 'POST' });
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.stringContaining('Unauthorized') }));
  });

  it('should return 429 if rate limited', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue('did:plc:123');
    vi.mocked(isRateLimited).mockReturnValue(true);
    const request = new Request('http://localhost', { method: 'POST' });
    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual(expect.objectContaining({ error: expect.stringContaining('Too many requests') }));
  });

  it('should return 400 if domain missing', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue('did:plc:123');
    vi.mocked(isRateLimited).mockReturnValue(false);
    const request = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'Missing domain to withdraw' }));
  });

  it('should return 403 if unauthorized or not found', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue('did:plc:123');
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue(null);
    
    const request = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ domain: 'test.com' }) });
    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'Unauthorized or domain not found' }));
  });

  it('should withdraw successfully', async () => {
    vi.mocked(verifyServiceAuth).mockResolvedValue('did:plc:123');
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({ domain: 'test.com', verifiedByDid: 'did:plc:123' } as any);
    
    const request = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ domain: 'test.com' }) });
    const response = await POST(request);
    
    expect(deleteVerifiedDomainFromDb).toHaveBeenCalledWith('test.com');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it('should return 500 if error occurs', async () => {
    vi.mocked(verifyServiceAuth).mockRejectedValue(new Error('Fatal'));
    const request = new Request('http://localhost', { method: 'POST' });
    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ success: false, error: 'Internal server error' });
  });
});
