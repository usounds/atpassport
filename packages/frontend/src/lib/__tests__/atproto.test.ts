import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProfile, publicAgent } from '../atproto';

vi.mock('@atcute/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@atcute/client')>();
  return {
    ...actual,
    ok: vi.fn().mockImplementation(async (promise) => {
      const res = await promise;
      return res;
    }),
  };
});

// Mock publicAgent.get
vi.spyOn(publicAgent, 'get');

describe('atproto Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return profile for a valid DID', async () => {
      const mockProfile = { did: 'did:plc:123', handle: 'user.test' };
      vi.mocked(publicAgent.get).mockResolvedValue(mockProfile as any);

      const result = await getProfile('did:plc:123');
      expect(result).toEqual(mockProfile);
      expect(publicAgent.get).toHaveBeenCalledWith('app.bsky.actor.getProfile', expect.any(Object));
    });

    it('should return null for an invalid DID', async () => {
      const result = await getProfile('invalid-did');
      expect(result).toBeNull();
      expect(publicAgent.get).not.toHaveBeenCalled();
    });

    it('should return null if agent.get throws', async () => {
      vi.mocked(publicAgent.get).mockRejectedValue(new Error('API Error'));
      const result = await getProfile('did:plc:123');
      expect(result).toBeNull();
    });
  });
});
