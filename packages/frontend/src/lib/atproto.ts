import { Client, ok, simpleFetchHandler } from '@atcute/client';
import { isDid } from '@atcute/lexicons/syntax';
import type { AtprotoDid } from '@atcute/lexicons/syntax';
import type { AppBskyActorDefs } from '@atcute/bluesky';

export const publicAgent = new Client({
  handler: simpleFetchHandler({ service: 'https://public.api.bsky.app' }),
});


export async function getProfiles(dids: string[]): Promise<Record<string, AppBskyActorDefs.ProfileViewDetailed>> {
  try {
    const validDids = dids.filter(isDid);
    if (validDids.length === 0) return {};

    const profiles: Record<string, AppBskyActorDefs.ProfileViewDetailed> = {};
    const CHUNK_SIZE = 25;
    const chunks: string[][] = [];
    for (let i = 0; i < validDids.length; i += CHUNK_SIZE) {
      chunks.push(validDids.slice(i, i + CHUNK_SIZE));
    }

    // Execute chunks in parallel
    const results = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const response = await ok(publicAgent.get('app.bsky.actor.getProfiles', {
            params: { actors: chunk as AtprotoDid[] },
          }));
          return response.profiles || [];
        } catch (e) {
          console.warn('[ATProto] getProfiles chunk failed:', e);
          return [];
        }
      })
    );

    results.flat().forEach((p) => {
      profiles[p.did] = p;
    });

    return profiles;
  } catch (e) {
    console.warn('[ATProto] getProfiles failed:', e);
    return {};
  }
}

export async function getProfile(did: string): Promise<AppBskyActorDefs.ProfileViewDetailed | null> {
  const profiles = await getProfiles([did]);
  return profiles[did] || null;
}
