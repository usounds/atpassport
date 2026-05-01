import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getSessionUuid } from '@/lib/session';
import { createShareToken } from '@/lib/share';
import { isRateLimited } from '@/lib/rate-limit';
import { getAssociations } from '@/lib/models';
import { NextRequest } from 'next/server';

vi.mock('@/lib/session');
vi.mock('@/lib/share');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/models');

describe('API: share/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 if IP rate limited', async () => {
    vi.mocked(isRateLimited).mockReturnValue(true);
    const request = new NextRequest('http://localhost', { headers: { 'x-forwarded-for': '1.2.3.4' } });
    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'rate_limit_exceeded' });
  });

  it('should return 401 if no session', async () => {
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getSessionUuid).mockResolvedValue(null);
    const request = new NextRequest('http://localhost');
    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'No session found' });
  });

  it('should return 403 if no handles registered', async () => {
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getSessionUuid).mockResolvedValue('uuid');
    vi.mocked(getAssociations).mockResolvedValue([]);
    const request = new NextRequest('http://localhost');
    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'No handles registered' });
  });

  it('should return 429 if UUID rate limited', async () => {
    vi.mocked(isRateLimited)
      .mockReturnValueOnce(false) // IP
      .mockReturnValueOnce(true); // UUID
    vi.mocked(getSessionUuid).mockResolvedValue('uuid');
    vi.mocked(getAssociations).mockResolvedValue([{ handle: 'test.bsky.social' } as any]);
    const request = new NextRequest('http://localhost');
    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'rate_limit_exceeded' });
  });

  it('should create token successfully', async () => {
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getSessionUuid).mockResolvedValue('uuid');
    vi.mocked(getAssociations).mockResolvedValue([{ handle: 'test.bsky.social' } as any]);
    vi.mocked(createShareToken).mockResolvedValue('token123');
    const request = new NextRequest('http://localhost');
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ token: 'token123' }));
  });

  it('should return 500 if error occurs', async () => {
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getSessionUuid).mockResolvedValue('uuid');
    vi.mocked(getAssociations).mockResolvedValue([{ handle: 'test.bsky.social' } as any]);
    vi.mocked(createShareToken).mockRejectedValue(new Error('DB Error'));
    const request = new NextRequest('http://localhost');
    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to create share token' });
  });
});
