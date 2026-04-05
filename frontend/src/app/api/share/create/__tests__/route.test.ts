import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getSessionUuid } from '@/lib/session';
import { createShareToken } from '@/lib/share';
import { isRateLimited } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/session');
vi.mock('@/lib/share');
vi.mock('@/lib/rate-limit');
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, init })),
  },
}));

describe('API: share/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 429 if IP rate limited', async () => {
    vi.mocked(isRateLimited).mockReturnValue(true);
    const request = { headers: { get: vi.fn().mockReturnValue('1.2.3.4') } } as unknown as Request;
    await POST(request as any);
    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'rate_limit_exceeded' }, { status: 429 });
  });

  it('should return 401 if no session', async () => {
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getSessionUuid).mockResolvedValue(null);
    const request = { headers: { get: vi.fn() } } as unknown as Request;
    await POST(request as any);
    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'No session found' }, { status: 401 });
  });

  it('should return 429 if UUID rate limited', async () => {
    vi.mocked(isRateLimited)
      .mockReturnValueOnce(false) // IP
      .mockReturnValueOnce(true); // UUID
    vi.mocked(getSessionUuid).mockResolvedValue('uuid');
    const request = { headers: { get: vi.fn() } } as unknown as Request;
    await POST(request as any);
    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'rate_limit_exceeded' }, { status: 429 });
  });

  it('should create token successfully', async () => {
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getSessionUuid).mockResolvedValue('uuid');
    vi.mocked(createShareToken).mockResolvedValue('token123');
    const request = { headers: { get: vi.fn() } } as unknown as Request;
    await POST(request as any);
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'token123' })
    );
  });

  it('should return 500 if error occurs', async () => {
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.mocked(getSessionUuid).mockResolvedValue('uuid');
    vi.mocked(createShareToken).mockRejectedValue(new Error('DB Error'));
    const request = { headers: { get: vi.fn() } } as unknown as Request;
    await POST(request as any);
    expect(NextResponse.json).toHaveBeenCalledWith({ error: 'Failed to create share token' }, { status: 500 });
  });
});
