import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSessionUuid, createSessionToken } from '../session';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

vi.mock('next/headers');
vi.mock('jose', () => {
  return {
    jwtVerify: vi.fn(),
    SignJWT: class {
      setProtectedHeader() { return this; }
      setIssuedAt() { return this; }
      setExpirationTime() { return this; }
      sign() { return Promise.resolve('mocked-token'); }
    }
  };
});

describe('Session Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null if no session cookie exists', async () => {
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue(null) } as any);
    const uuid = await getSessionUuid();
    expect(uuid).toBeNull();
  });

  it('should return uuid if valid session cookie exists', async () => {
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'valid-token' }) } as any);
    vi.mocked(jwtVerify).mockResolvedValue({ payload: { uuid: 'test-uuid' } } as any);
    
    const uuid = await getSessionUuid();
    expect(uuid).toBe('test-uuid');
  });

  it('should return null if session token is invalid', async () => {
    vi.mocked(cookies).mockResolvedValue({ get: vi.fn().mockReturnValue({ value: 'invalid-token' }) } as any);
    vi.mocked(jwtVerify).mockRejectedValue(new Error('Invalid token'));
    
    const uuid = await getSessionUuid();
    expect(uuid).toBeNull();
  });

  it('should create a session token', async () => {
    const token = await createSessionToken('test-uuid');
    expect(token).toBe('mocked-token');
  });
});
