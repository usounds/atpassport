import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSessionToken, getSessionUuid, SECRET_KEY, SESSION_COOKIE_NAME } from '../session';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('Session Library', () => {
  const mockUuid = 'test-uuid-1234';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SECRET_KEY should be a Uint8Array', () => {
    expect(SECRET_KEY).toBeDefined();
    expect(SECRET_KEY instanceof Uint8Array).toBe(true);
  });

  describe('createSessionToken', () => {
    it('should create a valid JWT token', async () => {
      const token = await createSessionToken(mockUuid);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify the token
      const { payload } = await jwtVerify(token, SECRET_KEY);
      expect(payload.uuid).toBe(mockUuid);
    });

    it('should have correct expiration (365d)', async () => {
      const token = await createSessionToken(mockUuid);
      const { payload } = await jwtVerify(token, SECRET_KEY);
      
      const now = Math.floor(Date.now() / 1000);
      expect(payload.iat).toBeLessThanOrEqual(now);
      
      const expectedExp = now + (365 * 24 * 60 * 60);
      expect(payload.exp).toBeGreaterThanOrEqual(expectedExp - 60);
      expect(payload.exp).toBeLessThanOrEqual(expectedExp + 60);
    });
  });

  describe('getSessionUuid', () => {
    it('should return null if no session cookie exists', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any);

      const result = await getSessionUuid();
      expect(result).toBeNull();
    });

    it('should return uuid from valid session cookie', async () => {
      const token = await createSessionToken(mockUuid);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: token }),
      } as any);

      const result = await getSessionUuid();
      expect(result).toBe(mockUuid);
    });

    it('should return null and handle errors for invalid token', async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: 'invalid-token' }),
      } as any);

      const result = await getSessionUuid();
      expect(result).toBeNull();
    });
  });
});
