import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getSessionUuid } from '@/lib/session';
import { createShareToken } from '@/lib/share';
import { isRateLimited } from '@/lib/rate-limit';

vi.mock('@/lib/session', () => ({
  getSessionUuid: vi.fn(),
}));

vi.mock('@/lib/share', () => ({
  createShareToken: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: vi.fn(),
}));

describe('POST /api/share/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no session is found', async () => {
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getSessionUuid).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/share/create', {
      method: 'POST'
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('should return 429 if rate limited', async () => {
    vi.mocked(isRateLimited).mockReturnValue(true);

    const request = new NextRequest('http://localhost/api/share/create', {
      method: 'POST'
    });
    const response = await POST(request);

    expect(response.status).toBe(429);
  });

  it('should return token on success', async () => {
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getSessionUuid).mockResolvedValue('test-uuid');
    vi.mocked(createShareToken).mockResolvedValue('test-token');

    const request = new NextRequest('http://localhost/api/share/create', {
      method: 'POST'
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.token).toBe('test-token');
  });
});
