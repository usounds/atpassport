import { describe, it, expect, vi } from 'vitest';
import { getProfile, publicAgent } from '../atproto';
import { type XRPCResponse } from '@atcute/client';
import { type ActorIdentifier } from '@atcute/lexicons/syntax';

// Mock ok from @atcute/client
vi.mock('@atcute/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@atcute/client')>();
  return {
    ...actual,
    ok: vi.fn().mockImplementation(async <T>(responsePromise: Promise<XRPCResponse<T>>) => {
      const res = await responsePromise;
      return res.data;
    }),
  };
});

describe('AtProto Library', () => {
  it('should get profile for a DID', async () => {
    const mockDID = 'did:plc:rgdcflm4ylsl6udghmtblydc' as ActorIdentifier;
    const mockProfile = { did: mockDID, handle: 'user.test' };
    vi.spyOn(publicAgent, 'get').mockResolvedValue({
      success: true,
      data: mockProfile,
      headers: {},
      status: 200,
    } as XRPCResponse<typeof mockProfile>);

    const result = await getProfile(mockDID);
    expect(result).toEqual(mockProfile);
  });
});
