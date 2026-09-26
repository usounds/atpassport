"use client";

import { useEffect, useRef, useState } from 'react';
import { moveAssociation, removeAssociation, refreshAssociation, type AssociationMutationResult } from './actions';
import { type AssociationWithProfile } from './models';
import { useProfileStore } from './profile-store';
import { syncAccountsPush, toFedCmAccount } from './fedcm-session-client';

export function useAccountList(initialItems: AssociationWithProfile[]) {
  const [items, setItems] = useState(initialItems);
  const epoch = useRef(0);
  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const generation = ++epoch.current;
    let cancelled = false;
    if (pending.current) return;
    setItems(initialItems);
    void syncAccountsPush(initialItems.map(toFedCmAccount));
    const enrich = async () => {
      if (!initialItems.length) return;
      const profiles = await useProfileStore.getState().fetchProfiles(initialItems.map(item => item.did));
      if (cancelled || generation !== epoch.current || pending.current) return;
      const updated = initialItems.map(item => ({ ...item, profile: profiles[item.did] || item.profile }));
      setItems(updated);
      void syncAccountsPush(updated.map(toFedCmAccount));
    };
    void enrich().catch(console.error);
    return () => { cancelled = true; };
  }, [initialItems]);

  const mutate = async (optimistic: AssociationWithProfile[], action: () => Promise<AssociationMutationResult>) => {
    if (pending.current) return;
    pending.current = true;
    epoch.current++;
    const previous = items;
    setItems(optimistic);
    try {
      const result = await action();
      if (!result.success) throw new Error(result.error);
      if (!mounted.current) return;
      // Never publish the optimistic snapshot, even when the server reports success.
      const storeProfiles = (useProfileStore.getState() as { profiles?: Record<string, import('@atcute/bluesky').AppBskyActorDefs.ProfileViewDetailed> }).profiles || {};
      const updated: AssociationWithProfile[] = result.associations.map(item => {
        const prof = storeProfiles[item.did] ?? previous.find(p => p.did === item.did)?.profile;
        return {
          ...item,
          ...(prof !== undefined ? { profile: prof } : {}),
        };
      });
      setItems(updated);
      await syncAccountsPush(updated.map(toFedCmAccount));
    } catch (error) {
      if (mounted.current) setItems(previous);
      console.error('[AccountList] Mutation failed:', error);
    } finally {
      pending.current = false;
    }
  };

  const handleDelete = (did: string) => mutate(items.filter(item => item.did !== did), () => removeAssociation(did));
  const handleMove = (did: string, direction: 'up' | 'down') => {
    const index = items.findIndex(item => item.did === did);
    const next = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || next < 0 || next >= items.length) return;
    const optimistic = [...items];
    [optimistic[index], optimistic[next]] = [optimistic[next], optimistic[index]];
    return mutate(optimistic, () => moveAssociation(did, direction));
  };
  const handleRefresh = async (did: string) => {
    if (pending.current) return;
    const generation = ++epoch.current;
    try {
      await refreshAssociation(did);
      const profiles = await useProfileStore.getState().fetchProfiles([did]);
      if (!mounted.current || generation !== epoch.current || pending.current) return;
      // Profile refresh changes presentation only. The revalidated server snapshot owns Push.
      setItems(prev => prev.map(item => item.did === did ? { ...item, profile: profiles[did] || item.profile } : item));
    } catch (error) { console.error('[AccountList] Profile refresh failed:', error); }
  };
  return { items, handleDelete, handleMove, handleRefresh };
}
