import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyServiceAuth } from '../verify-service-auth';
import { decodeJwt, decodeProtectedHeader, base64url } from 'jose';
import { getAtprotoVerificationMaterial } from '@atcute/identity';
import { getPublicKeyFromDidController, verifySig } from '@atcute/crypto';
import { resolveDidDocument } from '../atproto-server';

vi.mock('jose', () => ({
  decodeJwt: vi.fn(),
  decodeProtectedHeader: vi.fn(),
  base64url: {
    decode: vi.fn((s) => Buffer.from(s, 'base64url')),
  },
}));

vi.mock('@atcute/identity', () => ({
  getAtprotoVerificationMaterial: vi.fn(),
}));

vi.mock('@atcute/crypto', () => ({
  getPublicKeyFromDidController: vi.fn(),
  verifySig: vi.fn(),
}));

vi.mock('../atproto-server', () => ({
  resolveIdentity: vi.fn(),
  resolveDidDocument: vi.fn(),
}));

describe('verifyServiceAuth', () => {
  const mockDid = 'did:plc:user123';
  const mockHost = 'atpassport.net';
  const mockToken = 'header.payload.signature';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return DID when valid token and signature are provided', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
    vi.mocked(decodeJwt).mockReturnValue({
      iss: mockDid,
      aud: `did:web:${mockHost}`,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    vi.mocked(resolveDidDocument).mockResolvedValue({ id: mockDid } as any);
    vi.mocked(getAtprotoVerificationMaterial).mockReturnValue({ type: 'type', publicKeyMultibase: 'key' });
    vi.mocked(getPublicKeyFromDidController).mockReturnValue({ jwtAlg: 'ES256K' } as any);
    vi.mocked(verifySig).mockResolvedValue(true);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(mockDid);
    expect(resolveDidDocument).toHaveBeenCalledWith(mockDid);
    expect(verifySig).toHaveBeenCalled();
  });

  it('should return null if signature is invalid', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
    vi.mocked(decodeJwt).mockReturnValue({
      iss: mockDid,
      aud: `did:web:${mockHost}`,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    vi.mocked(resolveDidDocument).mockResolvedValue({ id: mockDid } as any);
    vi.mocked(getAtprotoVerificationMaterial).mockReturnValue({ type: 'type', publicKeyMultibase: 'key' });
    vi.mocked(getPublicKeyFromDidController).mockReturnValue({ jwtAlg: 'ES256K' } as any);
    vi.mocked(verifySig).mockResolvedValue(false);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if algorithm mismatch', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256' });
    vi.mocked(decodeJwt).mockReturnValue({
      iss: mockDid,
      aud: `did:web:${mockHost}`,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    vi.mocked(resolveDidDocument).mockResolvedValue({ id: mockDid } as any);
    vi.mocked(getAtprotoVerificationMaterial).mockReturnValue({ type: 'type', publicKeyMultibase: 'key' });
    vi.mocked(getPublicKeyFromDidController).mockReturnValue({ jwtAlg: 'ES256K' } as any);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if authorization header is missing', async () => {
    const request = new Request('https://example.com');
    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if token is expired', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
    vi.mocked(decodeJwt).mockReturnValue({
      iss: mockDid,
      aud: `did:web:${mockHost}`,
      exp: Math.floor(Date.now() / 1000) - 3600,
    });

    vi.mocked(resolveDidDocument).mockResolvedValue({ id: mockDid } as any);
    vi.mocked(getAtprotoVerificationMaterial).mockReturnValue({ type: 'type', publicKeyMultibase: 'key' });
    vi.mocked(getPublicKeyFromDidController).mockReturnValue({ jwtAlg: 'ES256K' } as any);
    vi.mocked(verifySig).mockResolvedValue(true);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if DID document cannot be resolved', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
    vi.mocked(decodeJwt).mockReturnValue({
      iss: mockDid,
      aud: `did:web:${mockHost}`,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    vi.mocked(resolveDidDocument).mockResolvedValue(null);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });
});
