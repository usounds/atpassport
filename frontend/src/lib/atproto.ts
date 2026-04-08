import { Client, ok, simpleFetchHandler } from '@atcute/client';
import { isDid } from '@atcute/lexicons/syntax';
import type { AtprotoDid, Handle } from '@atcute/lexicons/syntax';
import type { AppBskyActorDefs } from '@atcute/bluesky';

export const publicAgent = new Client({
  handler: simpleFetchHandler({ service: 'https://public.api.bsky.app' }),
});

export interface BskyProfile {
  did: AtprotoDid;
  handle: Handle;
  displayName?: string;
  description?: string;
  avatar?: string;
  banner?: string;
  [key: string]: unknown;
}

export async function getProfile(did: string): Promise<AppBskyActorDefs.ProfileViewDetailed | null> {
  try {
    if (!isDid(did)) return null;
    const profile = await ok(publicAgent.get('app.bsky.actor.getProfile', {
      params: { actor: did as AtprotoDid },
    }));
    return profile;
  } catch {
    return null;
  }
}
