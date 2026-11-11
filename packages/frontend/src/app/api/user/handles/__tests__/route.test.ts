import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, OPTIONS } from '../route';
import { getSessionUuid } from '@/lib/session';
import { getAssociations } from '@/lib/models';
import { isRateLimited } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

vi.mock('@/lib/session');
vi.mock('@/lib/models');
vi.mock('@/lib/rate-limit');

describe('API: user/handles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 429 if IP rate limited', async () => {
      vi.mocked(isRateLimited).mockReturnValue(true);
      const request = new NextRequest('http://localhost', { headers: { origin: 'http://localhost:3000' } });
      const response = await GET(request);
      expect(response.status).toBe(429);
    });

    it('should return 401 if no session', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      const request = new NextRequest('http://localhost');
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return 429 if UUID rate limited', async () => {
      vi.mocked(isRateLimited)
        .mockReturnValueOnce(false) // IP
        .mockReturnValueOnce(true); // UUID
      vi.mocked(getSessionUuid).mockResolvedValue('uuid');
      const request = new NextRequest('http://localhost');
      const response = await GET(request);
      expect(response.status).toBe(429);
    });

    it('should return handles successfully with CORS', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getSessionUuid).mockResolvedValue('uuid');
      vi.mocked(getAssociations).mockResolvedValue([
        { handle: 'user1.bsky.social' } as unknown as any
      ]);

      const request = new NextRequest('http://localhost', { headers: { origin: 'https://atpassport.net' } });
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.handles).toContain('user1.bsky.social');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://atpassport.net');
    });

    it('should not set CORS for disallowed origin', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getSessionUuid).mockResolvedValue('uuid');
      vi.mocked(getAssociations).mockResolvedValue([]);

      const request = new NextRequest('http://localhost', { headers: { origin: 'https://malicious.com' } });
      const response = await GET(request);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should allow moz-extension origins for Firefox compatibility', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getSessionUuid).mockResolvedValue('uuid');
      vi.mocked(getAssociations).mockResolvedValue([]);

      const request = new NextRequest('http://localhost', { headers: { origin: 'moz-extension://random-uuid-12345' } });
      const response = await GET(request);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('moz-extension://random-uuid-12345');
    });

    it('should reject localhost origins in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      const envObj = process.env as Record<string, string | undefined>;
      try {
        envObj.NODE_ENV = 'production';
        vi.mocked(isRateLimited).mockReturnValue(false);
        vi.mocked(getSessionUuid).mockResolvedValue('uuid');
        vi.mocked(getAssociations).mockResolvedValue([]);

        const request = new NextRequest('http://localhost', { headers: { origin: 'http://localhost:3000' } });
        const response = await GET(request);
        
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      } finally {
        envObj.NODE_ENV = originalEnv;
      }
    });

    it('should return handles successfully without origin header', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getSessionUuid).mockResolvedValue('uuid');
      vi.mocked(getAssociations).mockResolvedValue([{ handle: 'user1' } as any]);

      const request = new NextRequest('http://localhost');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should return 500 if error occurs', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getSessionUuid).mockRejectedValue(new Error('Fatal'));
      const request = new NextRequest('http://localhost');
      const response = await GET(request);
      expect(response.status).toBe(500);
    });
  });

  describe('OPTIONS', () => {
    it('should handle CORS preflight for allowed origin', async () => {
      const request = new NextRequest('http://localhost', { method: 'OPTIONS', headers: { origin: 'http://localhost:3001' } });
      const response = await OPTIONS(request);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
    });

    it('should not handle CORS preflight for disallowed origin', async () => {
      const request = new NextRequest('http://localhost', { method: 'OPTIONS', headers: { origin: 'https://other.com' } });
      const response = await OPTIONS(request);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });
});
