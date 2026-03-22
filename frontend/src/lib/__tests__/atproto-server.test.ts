import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveIdentity } from '../atproto-server';

// Mock identity resolver as classes
vi.mock('@atcute/identity-resolver', () => {
  return {
    CompositeHandleResolver: class {},
    WellKnownHandleResolver: class {},
    CompositeDidDocumentResolver: class {},
    PlcDidDocumentResolver: class {},
    WebDidDocumentResolver: class {},
    LocalActorResolver: class {
      resolve = vi.fn().mockImplementation(async (handle: string) => {
        if (handle === 'valid.bsky.social') {
          return {
            did: 'did:plc:1234',
            handle: 'valid.bsky.social',
            pds: 'https://pds.bsky.network'
          };
        }
        throw new Error('Resolution failed');
      });
    }
  };
});

// identity-resolver-node もモック
vi.mock('@atcute/identity-resolver-node', () => ({
  NodeDnsHandleResolver: class {}
}));

describe('atproto-server Identity Resolution', () => {
  it('should resolve a valid identity', async () => {
    const result = await resolveIdentity('valid.bsky.social');
    expect(result).toEqual({
      did: 'did:plc:1234',
      handle: 'valid.bsky.social',
      pdsUrl: 'https://pds.bsky.network'
    });
  });

  it('should return null for invalid identity', async () => {
    const result = await resolveIdentity('invalid.handle');
    expect(result).toBeNull();
  });
});
