import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyServiceAuth } from '../verify-service-auth';
import { decodeJwt } from 'jose';
import { resolveIdentity } from '../atproto-server';

vi.mock('jose', () => ({
  decodeJwt: vi.fn(),
}));

vi.mock('../atproto-server', () => ({
  resolveIdentity: vi.fn(),
}));

describe('verifyServiceAuth', () => {
  const mockDid = 'did:plc:user123';
  const mockHost = 'atpassport.net';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return DID when valid token is provided', async () => {
    const mockToken = 'valid-token';
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    vi.mocked(decodeJwt).mockReturnValue({
      iss: mockDid,
      aud: `did:web:${mockHost}`,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    vi.mocked(resolveIdentity).mockResolvedValue({
      did: mockDid,
      handle: 'user.test',
    });

    const result = await verifyServiceAuth(request);
    expect(result).toBe(mockDid);
    expect(resolveIdentity).toHaveBeenCalledWith(mockDid);
  });

  it('should return null if authorization header is missing', async () => {
    const request = new Request('https://example.com');
    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if token is expired', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': 'Bearer expired-token',
        'host': mockHost,
      },
    });

    vi.mocked(decodeJwt).mockReturnValue({
      iss: mockDid,
      aud: `did:web:${mockHost}`,
      exp: Math.floor(Date.now() / 1000) - 3600,
    });

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if identity cannot be resolved', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': 'Bearer token',
        'host': mockHost,
      },
    });

    vi.mocked(decodeJwt).mockReturnValue({
      iss: mockDid,
      aud: `did:web:${mockHost}`,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    vi.mocked(resolveIdentity).mockResolvedValue(null);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if issuer is invalid', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': 'Bearer token',
      },
    });

    vi.mocked(decodeJwt).mockReturnValue({
      iss: 'invalid-did',
    });

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });
});
