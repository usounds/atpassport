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

    const response = await ok(publicAgent.get('app.bsky.actor.getProfiles', {
      params: { actors: validDids as AtprotoDid[] },
    }));

    if (!response.profiles || !Array.isArray(response.profiles)) {
      return {};
    }

    const profiles: Record<string, AppBskyActorDefs.ProfileViewDetailed> = {};
    response.profiles.forEach((p) => {
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
