import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, OPTIONS } from '../route';
import { NextRequest } from 'next/server';
import { getSessionUuid } from '@/lib/session';
import { getAssociations } from '@/lib/models';

vi.mock('@/lib/session');
vi.mock('@/lib/models');

describe('API: /api/user/handles', () => {
  const mockUuid = 'test-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return handles if authorized', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { handle: 'user1.test' } as any,
        { handle: 'user2.test' } as any
      ]);

      const request = new NextRequest('https://atpassport.net/api/user/handles');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.handles).toEqual(['user1.test', 'user2.test']);
    });

    it('should return 401 if unauthorized', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(null);

      const request = new NextRequest('https://atpassport.net/api/user/handles');
      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });

    it('should handle CORS for extension origin', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([]);

      const origin = 'chrome-extension://abcdef';
      const request = new NextRequest('https://atpassport.net/api/user/handles', {
        headers: { origin }
      });
      const response = await GET(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    });

    it('should handle CORS for localhost', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([]);

      const origin = 'http://localhost:3000';
      const request = new NextRequest('https://atpassport.net/api/user/handles', {
        headers: { origin }
      });
      const response = await GET(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    });

    it('should handle CORS for main domain', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([]);

      const origin = 'https://atpassport.net';
      const request = new NextRequest('https://atpassport.net/api/user/handles', {
        headers: { origin }
      });
      const response = await GET(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    });

    it('should not set CORS for unknown origin', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([]);

      const request = new NextRequest('https://atpassport.net/api/user/handles', {
        headers: { origin: 'https://evil.com' }
      });
      const response = await GET(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should return 500 on internal error', async () => {
      vi.mocked(getSessionUuid).mockRejectedValue(new Error('DB Fail'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest('https://atpassport.net/api/user/handles');
      const response = await GET(request);

      expect(response.status).toBe(500);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('OPTIONS', () => {
    it('should return 204 and handle CORS', async () => {
      const origin = 'http://localhost:3000';
      const request = new NextRequest('https://atpassport.net/api/user/handles', {
        method: 'OPTIONS',
        headers: { origin }
      });
      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    });

    it('should not set CORS for invalid origin in OPTIONS', async () => {
      const request = new NextRequest('https://atpassport.net/api/user/handles', {
        method: 'OPTIONS',
        headers: { origin: 'https://evil.com' }
      });
      const response = await OPTIONS(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });
});
