'use client';

import { Text, Stack } from '@mantine/core';
import { AuthAccountItem } from "./AuthAccountItem";
import { useTranslations } from "next-intl";
import { useState, useEffect } from 'react';
import { refreshAssociation, removeAssociation, moveAssociation } from '@/lib/actions';

export function AuthAccountList({ 
  initialItems, 
  callback, 
  atpstate, 
  domain,
}: { 
  initialItems: any[]; 
  callback: string; 
  atpstate?: string;
  domain: string;
}) {
  const t = useTranslations('Auth');
  const [items, setItems] = useState(initialItems);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleRefresh = async (did: string) => {
    await refreshAssociation(did);
  };

  const handleDelete = async (did: string) => {
    setItems(prev => prev.filter(item => item.did !== did));
    await removeAssociation(did);
  };

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

  if (items.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t('no_accounts')}
      </Text>
    );
  }

  return (
    <Stack gap={0} className="flat-list-container">
      {items.map((item, index) => (
        <AuthAccountItem 
          key={`${item.did}-${index}`} 
          item={item} 
          callback={callback}
          atpstate={atpstate}
          domain={domain}
          onSelect={() => setAuthenticating(true)}
          onRefresh={() => handleRefresh(item.did)}
          onDelete={() => handleDelete(item.did)}
          onMoveUp={() => handleMove(item.did, 'up')}
          onMoveDown={() => handleMove(item.did, 'down')}
          isFirst={index === 0}
          isLast={index === items.length - 1}
          disabled={authenticating}
          index={index}
        />
      ))}
    </Stack>
  );
}
