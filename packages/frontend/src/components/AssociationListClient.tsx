'use client';

import { useState, useEffect } from 'react';
import { Stack } from '@mantine/core';
import { AssociationItem } from './AssociationItem';
import { moveAssociation, removeAssociation, refreshAssociation } from '@/lib/actions';
import { type AssociationWithProfile } from '@/lib/models';
import { getProfiles } from '@/lib/atproto';

export function AssociationListClient({ initialItems }: { initialItems: AssociationWithProfile[] }) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      const dids = initialItems.map(item => item.did);
      if (dids.length === 0) return;

      setLoading(true);
      try {
        console.log(`[AssociationListClient] Fetching profiles for ${dids.length} items...`);
        const profilesMap = await getProfiles(dids);
        
        setItems(prev => prev.map(item => ({
          ...item,
          profile: profilesMap[item.did] || item.profile
        })));
      } finally {
        setLoading(false);
      }
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

    setItems(newItems);
    await moveAssociation(did, direction);
  };

  const handleDelete = async (did: string) => {
    setItems(prev => prev.filter(item => item.did !== did));
    await removeAssociation(did);
  };

  const handleRefresh = async (did: string) => {
    // For refresh, we might want to update the specific item after the server action
    await refreshAssociation(did);
    // Note: Since we're using client state, we might need a way to get the updated profile back.
    // For now, let's just trigger the action.
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
