import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { getSessionUuid } from '@/lib/session';
import { getAssociations } from '@/lib/models';

vi.mock('@/lib/session', () => ({
  getSessionUuid: vi.fn(),
}));

vi.mock('@/lib/models', () => ({
  getAssociations: vi.fn(),
}));

describe('GET /api/user/handles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if no session is found', async () => {
    vi.mocked(getSessionUuid).mockResolvedValue(null);

    const request = new NextRequest('http://localhost/api/user/handles');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('should return handles if session is valid', async () => {
    const mockUuid = 'test-uuid';
    vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
    vi.mocked(getAssociations).mockResolvedValue([
      { handle: 'user1.bsky.social' } as any,
      { handle: 'user2.bsky.social' } as any,
    ]);

    const request = new NextRequest('http://localhost/api/user/handles');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.handles).toEqual(['user1.bsky.social', 'user2.bsky.social']);
  });

  it('should handle CORS for extensions', async () => {
    const mockUuid = 'test-uuid';
    vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
    vi.mocked(getAssociations).mockResolvedValue([{ handle: 'user.bsky.social' } as any]);

    const extensionOrigin = 'chrome-extension://abcdef';
    const request = new NextRequest('http://localhost/api/user/handles', {
      headers: { origin: extensionOrigin }
    });
    const response = await GET(request);

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(extensionOrigin);
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});
