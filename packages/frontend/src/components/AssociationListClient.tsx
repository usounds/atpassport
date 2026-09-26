'use client';

import { useState, useEffect } from 'react';
import { Stack } from '@mantine/core';
import { AssociationItem } from './AssociationItem';
import { moveAssociation, removeAssociation, refreshAssociation } from '@/lib/actions';
import { type AssociationWithProfile } from '@/lib/models';
import { useProfileStore } from '@/lib/profile-store';
import { toFedCmAccount, syncAccountsPush } from '@/lib/fedcm-session-client';

export function AssociationListClient({ initialItems }: { initialItems: AssociationWithProfile[] }) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    void syncAccountsPush(initialItems.map(toFedCmAccount));

    const fetchProfiles = async () => {
      const dids = initialItems.map(item => item.did);
      if (dids.length === 0) return;

      console.log('[AssociationListClient] Fetching profiles for %s items...', dids.length);
      const profilesMap = await useProfileStore.getState().fetchProfiles(dids);
      
      const updated = initialItems.map(item => ({
        ...item,
        profile: profilesMap[item.did] || item.profile
      }));
      setItems(updated);
      void syncAccountsPush(updated.map(toFedCmAccount));
    };

    fetchProfiles();
  }, [initialItems]);

  // Props sync with render-phase state update
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
  if (initialItems !== prevInitialItems) {
    setItems(initialItems);
    setPrevInitialItems(initialItems);
  }

  const handleMove = async (did: string, direction: 'up' | 'down') => {
    const index = items.findIndex(item => item.did === did);
    if (index === -1) return;

    const newItems = [...items];
    if (direction === 'up' && index > 0) {
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    } else if (direction === 'down' && index < items.length - 1) {
      [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
    } else {
      return;
    }

    const previousItems = items;
    setItems(newItems);

    try {
      await moveAssociation(did, direction);
      void syncAccountsPush(newItems.map(toFedCmAccount));
    } catch (e) {
      console.error('[AssociationListClient] Failed to move association:', e);
      setItems(previousItems);
    }
  };

  const handleDelete = async (did: string) => {
    const previousItems = items;
    const nextItems = items.filter(item => item.did !== did);
    setItems(nextItems);

    try {
      await removeAssociation(did);
      void syncAccountsPush(nextItems.map(toFedCmAccount));
    } catch (e) {
      console.error('[AssociationListClient] Failed to remove association:', e);
      setItems(previousItems);
    }
  };

  const handleRefresh = async (did: string) => {
    try {
      await refreshAssociation(did);
      const profilesMap = await useProfileStore.getState().fetchProfiles([did]);
      if (profilesMap[did]) {
        setItems(prev => {
          const updated = prev.map(item => item.did === did ? { ...item, profile: profilesMap[did] } : item);
          void syncAccountsPush(updated.map(toFedCmAccount));
          return updated;
        });
      }
    } catch (e) {
      console.error('[AssociationListClient] Failed to refresh association:', e);
    }
  };

  return (
    <Stack gap={0} className="flat-list-container">
      {items.map((item, index) => (
        <AssociationItem 
          key={item.did} 
          item={item} 
          onMoveUp={() => handleMove(item.did, 'up')}
          onMoveDown={() => handleMove(item.did, 'down')}
          onDelete={() => handleDelete(item.did)}
          onRefresh={() => handleRefresh(item.did)}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          index={index}
        />
      ))}
    </Stack>
  );
}
