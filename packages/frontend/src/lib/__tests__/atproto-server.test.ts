import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveIdentity, resolveDidDocument } from '../atproto-server';

// Use vi.hoisted for variables that need to be available in vi.mock
const { mockResolve, mockResolveDid } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockResolveDid: vi.fn(),
}));

// Mock identity resolver as classes
vi.mock('@atcute/identity-resolver', () => {
  return {
    CompositeHandleResolver: class {},
    WellKnownHandleResolver: class {},
    CompositeDidDocumentResolver: class {
      resolve = mockResolveDid;
    },
    PlcDidDocumentResolver: class {},
    WebDidDocumentResolver: class {},
    LocalActorResolver: class {
      resolve = mockResolve;
    }
  };
});

vi.mock('@atcute/identity-resolver-node', () => ({
  NodeDnsHandleResolver: class {}
}));

describe('atproto-server Identity Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveIdentity', () => {
    it('should resolve a valid identity', async () => {
      mockResolve.mockResolvedValueOnce({
        did: 'did:plc:1234',
        handle: 'valid.bsky.social',
        pds: 'https://pds.bsky.network'
      });

      const result = await resolveIdentity('valid.bsky.social');
      expect(result).toEqual({
        did: 'did:plc:1234',
        handle: 'valid.bsky.social',
        pdsUrl: 'https://pds.bsky.network'
      });
    });

    it('should return null if actor has no DID or PDS', async () => {
      mockResolve.mockResolvedValueOnce({
        did: null,
        pds: null
      });

      const result = await resolveIdentity('no-did.bsky.social');
      expect(result).toBeNull();
    });

    it('should return null and NOT log error for ActorResolutionError', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Resolution failed');
      error.name = 'ActorResolutionError';
      mockResolve.mockRejectedValueOnce(error);

      const result = await resolveIdentity('invalid.handle');
      expect(result).toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should return null and NOT log error for DidNotFoundError cause', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Resolution failed');
      (error as any).cause = { name: 'DidNotFoundError' };
      mockResolve.mockRejectedValueOnce(error);

      const result = await resolveIdentity('missing.bsky.social');
      expect(result).toBeNull();
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should return null and log error for unexpected errors', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockResolve.mockRejectedValueOnce(new Error('Fatal Server Error'));

      const result = await resolveIdentity('error.bsky.social');
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should return null for malformed identifier', async () => {
      const result = await resolveIdentity('not-a-handle!!');
      expect(result).toBeNull();
    });
  });

  describe('resolveDidDocument', () => {
    it('should resolve did:plc documents', async () => {
      const mockDoc = { id: 'did:plc:1234' };
      mockResolveDid.mockResolvedValueOnce(mockDoc);

      const result = await resolveDidDocument('did:plc:1234');
      expect(result).toEqual(mockDoc);
      expect(mockResolveDid).toHaveBeenCalledWith('did:plc:1234');
    });

    it('should resolve did:web documents', async () => {
      const mockDoc = { id: 'did:web:example.com' };
      mockResolveDid.mockResolvedValueOnce(mockDoc);

      const result = await resolveDidDocument('did:web:example.com');
      expect(result).toEqual(mockDoc);
      expect(mockResolveDid).toHaveBeenCalledWith('did:web:example.com');
    });

    it('should return null for non-plc/web DIDs', async () => {
      const result = await resolveDidDocument('did:key:z6MkpTHR8VNsBxY8SJkyS1qit9W67cKx7Y7oJ6uB79679679');
      expect(result).toBeNull();
    });

    it('should return null for invalid DIDs', async () => {
      const result = await resolveDidDocument('invalid-did');
      expect(result).toBeNull();
    });

    it('should return null and log error when resolution fails', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockResolveDid.mockRejectedValueOnce(new Error('Network error'));

      const result = await resolveDidDocument('did:plc:error');
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
