import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, OPTIONS } from '../route';
import { NextRequest } from 'next/server';
import { getSessionUuid } from '@/lib/session';
import { getAssociations, IdentityAssociation } from '@/lib/models';
import { getProfiles } from '@/lib/atproto';

vi.mock('@/lib/session');
vi.mock('@/lib/models');
vi.mock('@/lib/atproto');

describe('API: /api/user/handles', () => {
  const mockUuid = 'test-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return handles and accounts if authorized', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: 'did:plc:1', handle: 'user1.test' } as Partial<IdentityAssociation> as IdentityAssociation,
        { did: 'did:plc:2', handle: 'user2.test' } as Partial<IdentityAssociation> as IdentityAssociation
      ]);
      vi.mocked(getProfiles).mockResolvedValue({
        'did:plc:1': {
          did: 'did:plc:1',
          handle: 'user1.test',
          displayName: 'User One',
          avatar: 'https://example.com/avatar1.jpg'
        } as any
      });

      const request = new NextRequest('https://atpassport.net/api/user/handles');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.handles).toEqual(['user1.test', 'user2.test']);
      expect(data.accounts).toEqual([
        {
          did: 'did:plc:1',
          handle: 'user1.test',
          displayName: 'User One',
          avatar: 'https://example.com/avatar1.jpg'
        },
        {
          did: 'did:plc:2',
          handle: 'user2.test',
          displayName: undefined,
          avatar: undefined
        }
      ]);
    });

    it('should return 401 if unauthorized and still set CORS headers', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(null);

      const origin = 'chrome-extension://ollhnghmplgpoebaceomdaigpkihpfkn';
      const request = new NextRequest('https://atpassport.net/api/user/handles', {
        headers: { origin }
      });
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should handle CORS for moz-extension UUID origin', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([]);

      const origin = 'moz-extension://c3b88d8b-4b14-4340-9a40-d9d107a61d8a';
      const request = new NextRequest('https://atpassport.net/api/user/handles', {
        headers: { origin }
      });
      const response = await GET(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should handle CORS for extension origin', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([]);

      const origin = 'chrome-extension://ollhnghmplgpoebaceomdaigpkihpfkn';
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
