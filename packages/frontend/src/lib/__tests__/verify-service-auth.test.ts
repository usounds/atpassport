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
  const mockLxm = 'net.atpassport.verify.submit';
  const validPayload = (overrides: Record<string, unknown> = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return {
      iss: mockDid,
      aud: `did:web:${mockHost}`,
      lxm: mockLxm,
      iat: now,
      exp: now + 120,
      ...overrides,
    };
  };

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
    vi.mocked(decodeJwt).mockReturnValue(validPayload());

    vi.mocked(resolveDidDocument).mockResolvedValue({ id: mockDid } as any);
    vi.mocked(getAtprotoVerificationMaterial).mockReturnValue({ type: 'type', publicKeyMultibase: 'key' });
    vi.mocked(getPublicKeyFromDidController).mockReturnValue({ jwtAlg: 'ES256K' } as any);
    vi.mocked(verifySig).mockResolvedValue(true);

    const result = await verifyServiceAuth(request, mockLxm);
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
    vi.mocked(decodeJwt).mockReturnValue(validPayload());

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
    vi.mocked(decodeJwt).mockReturnValue(validPayload());

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
    vi.mocked(decodeJwt).mockReturnValue(validPayload({ exp: Math.floor(Date.now() / 1000) - 3600 }));

    vi.mocked(resolveDidDocument).mockResolvedValue({ id: mockDid } as any);
    vi.mocked(getAtprotoVerificationMaterial).mockReturnValue({ type: 'type', publicKeyMultibase: 'key' });
    vi.mocked(getPublicKeyFromDidController).mockReturnValue({ jwtAlg: 'ES256K' } as any);
    vi.mocked(verifySig).mockResolvedValue(true);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if expiration is missing', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    const { exp: _exp, ...payload } = validPayload();
    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
    vi.mocked(decodeJwt).mockReturnValue(payload);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if issued-at is missing', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    const { iat: _iat, ...payload } = validPayload();
    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
    vi.mocked(decodeJwt).mockReturnValue(payload);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if token lifetime is too long', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    const now = Math.floor(Date.now() / 1000);
    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
    vi.mocked(decodeJwt).mockReturnValue(validPayload({ iat: now, exp: now + 3600 }));

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if service auth method does not match', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
    vi.mocked(decodeJwt).mockReturnValue(validPayload({ lxm: 'net.atpassport.verify.list' }));

    const result = await verifyServiceAuth(request, mockLxm);
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
    vi.mocked(decodeJwt).mockReturnValue(validPayload());

    vi.mocked(resolveDidDocument).mockResolvedValue(null);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if audience mismatch', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
    vi.mocked(decodeJwt).mockReturnValue(validPayload({ aud: 'did:web:evil-host.net' })); // Mismatch

    vi.mocked(resolveDidDocument).mockResolvedValue({ id: mockDid } as any);
    vi.mocked(getAtprotoVerificationMaterial).mockReturnValue({ type: 'type', publicKeyMultibase: 'key' });
    vi.mocked(getPublicKeyFromDidController).mockReturnValue({ jwtAlg: 'ES256K' } as any);
    vi.mocked(verifySig).mockResolvedValue(true);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null); 
  });

  it('should verify with allowed secondary audiences', async () => {
    const allowedHosts = ['atpassport.net', 'dev.atpassport.net'];
    
    for (const host of allowedHosts) {
      const request = new Request('https://example.com', {
        headers: {
          'authorization': `Bearer ${mockToken}`,
          'host': 'another-host.net', // Host header is different, but aud matches allowed whitelist
        },
      });

      vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
      vi.mocked(decodeJwt).mockReturnValue(validPayload({ aud: `did:web:${host}` }));

      vi.mocked(resolveDidDocument).mockResolvedValue({ id: mockDid } as any);
      vi.mocked(getAtprotoVerificationMaterial).mockReturnValue({ type: 'type', publicKeyMultibase: 'key' });
      vi.mocked(getPublicKeyFromDidController).mockReturnValue({ jwtAlg: 'ES256K' } as any);
      vi.mocked(verifySig).mockResolvedValue(true);

      const result = await verifyServiceAuth(request);
      expect(result).toBe(mockDid);
    }
  });

  it('should return null if JWT format is invalid', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': 'Bearer invalid-token-no-dots',
      },
    });

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if verification material is missing', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
        'host': mockHost,
      },
    });

    vi.mocked(decodeProtectedHeader).mockReturnValue({ alg: 'ES256K' });
    vi.mocked(decodeJwt).mockReturnValue(validPayload());

    vi.mocked(resolveDidDocument).mockResolvedValue({ id: mockDid } as any);
    vi.mocked(getAtprotoVerificationMaterial).mockReturnValue(undefined);

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if issuer is not a string or not a DID', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
      },
    });

    vi.mocked(decodeJwt).mockReturnValue(validPayload({ iss: 'not-a-did' }));

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });

  it('should return null if an error occurs during processing', async () => {
    const request = new Request('https://example.com', {
      headers: {
        'authorization': `Bearer ${mockToken}`,
      },
    });

    vi.mocked(decodeJwt).mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await verifyServiceAuth(request);
    expect(result).toBe(null);
  });
});
