import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppBskyActorDefs } from '@atcute/bluesky';
import { getProfiles } from './atproto';

interface ProfileState {
  profiles: Record<string, AppBskyActorDefs.ProfileViewDetailed>;
  timestamps: Record<string, number>;
  fetchProfiles: (dids: string[], force?: boolean) => Promise<Record<string, AppBskyActorDefs.ProfileViewDetailed>>;
  clear: () => void;
}

const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const inflight = new Map<string, Promise<AppBskyActorDefs.ProfileViewDetailed | null>>();

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: {},
      timestamps: {},
      fetchProfiles: async (dids, force = false) => {
        const { profiles, timestamps } = get();
        const now = Date.now();
        
        const results: Record<string, AppBskyActorDefs.ProfileViewDetailed> = {};
        const toFetchFromApi: string[] = [];

        for (const did of dids) {
          const cached = profiles[did];
          const ts = timestamps[did];
          if (!force && cached && ts && now - ts < CACHE_TTL) {
            results[did] = cached;
          } else {
            toFetchFromApi.push(did);
          }
        }

        if (toFetchFromApi.length === 0) return results;

        // Deduplicate concurrent requests
        const toCall: string[] = [];
        const inflightPromises: Promise<void>[] = [];

        for (const did of toFetchFromApi) {
          const pending = inflight.get(did);
          if (pending) {
            inflightPromises.push((async () => {
              const p = await pending;
              if (p) results[did] = p;
            })());
          } else {
            toCall.push(did);
          }
        }

        if (toCall.length > 0) {
          const fetchPromise = getProfiles(toCall).then(newProfiles => {
            const fetchNow = Date.now();
            const newTimestamps: Record<string, number> = {};
            for (const did in newProfiles) {
              newTimestamps[did] = fetchNow;
              results[did] = newProfiles[did];
            }
            
            set((state) => ({
              profiles: { ...state.profiles, ...newProfiles },
              timestamps: { ...state.timestamps, ...newTimestamps },
            }));

            // Clean up inflight map
            toCall.forEach(did => setTimeout(() => inflight.delete(did), 0));
            return newProfiles;
          });

          toCall.forEach(did => {
            inflight.set(did, fetchPromise.then(res => res[did] || null));
          });

          inflightPromises.push(fetchPromise.then(() => {}));
        }

        await Promise.all(inflightPromises);
        return results;
      },
      clear: () => {
        set({ profiles: {}, timestamps: {} });
      },
    }),
    {
      name: 'atpassport-profile-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
