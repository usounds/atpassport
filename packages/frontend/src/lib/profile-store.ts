import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppBskyActorDefs } from '@atcute/bluesky';
import { getProfiles } from './atproto';

interface ProfileState {
  profiles: Record<string, AppBskyActorDefs.ProfileViewDetailed>;
  timestamps: Record<string, number>;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
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
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      fetchProfiles: async (dids, force = false) => {
        // Wait for hydration if not yet done (up to 2 seconds)
        if (!get()._hasHydrated) {
          console.log('[ProfileStore] Waiting for hydration...');
          for (let i = 0; i < 20; i++) {
            if (get()._hasHydrated) break;
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

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

        const cachedCount = dids.length - toFetchFromApi.length;
        if (cachedCount > 0) {
          console.log(`[ProfileStore] Cache hit: ${cachedCount}/${dids.length} profiles`);
        }

        if (toFetchFromApi.length === 0) return results;

        console.log(`[ProfileStore] Fetching ${toFetchFromApi.length} profiles from API...`);

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
      onRehydrateStorage: (state) => {
        return () => state?.setHasHydrated(true);
      }
    }
  )
);
