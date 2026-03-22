import { describe, it, expect, vi } from 'vitest';
import { getProfile, publicAgent } from '../atproto';

describe('AtProto Library', () => {
  it('should get profile for a DID', async () => {
    const mockProfile = { did: 'did:123', handle: 'user.test' };
    const spy = vi.spyOn(publicAgent, 'get').mockResolvedValue({
      success: true,
      data: mockProfile,
    } as any);

    const result = await getProfile('did:123');
    expect(result).toEqual(mockProfile);
  });
});
