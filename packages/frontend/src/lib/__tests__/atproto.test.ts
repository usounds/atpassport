import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProfile, getProfiles, publicAgent } from '../atproto';

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

  describe('getProfiles', () => {
    it('should return a record of profiles for valid DIDs', async () => {
      const mockProfiles = [
        { did: 'did:plc:123', handle: 'user1.test' },
        { did: 'did:plc:456', handle: 'user2.test' },
      ];
      vi.mocked(publicAgent.get).mockResolvedValue({ profiles: mockProfiles } as any);

      const result = await getProfiles(['did:plc:123', 'did:plc:456']);
      expect(result).toEqual({
        'did:plc:123': mockProfiles[0],
        'did:plc:456': mockProfiles[1],
      });
      expect(publicAgent.get).toHaveBeenCalledWith('app.bsky.actor.getProfiles', expect.objectContaining({
        params: { actors: ['did:plc:123', 'did:plc:456'] }
      }));
    });

    it('should return empty record for empty DIDs', async () => {
      const result = await getProfiles([]);
      expect(result).toEqual({});
      expect(publicAgent.get).not.toHaveBeenCalled();
    });

    it('should return empty record if agent.get throws', async () => {
      vi.mocked(publicAgent.get).mockRejectedValue(new Error('API Error'));
      const result = await getProfiles(['did:plc:123']);
      expect(result).toEqual({});
    });
  });

  describe('getProfile', () => {
    it('should return profile for a valid DID', async () => {
      const mockProfile = { did: 'did:plc:123', handle: 'user.test' };
      vi.mocked(publicAgent.get).mockResolvedValue({ profiles: [mockProfile] } as any);

      const result = await getProfile('did:plc:123');
      expect(result).toEqual(mockProfile);
      expect(publicAgent.get).toHaveBeenCalledWith('app.bsky.actor.getProfiles', expect.objectContaining({
        params: { actors: ['did:plc:123'] }
      }));
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
