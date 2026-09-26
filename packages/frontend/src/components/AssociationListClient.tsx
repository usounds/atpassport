'use client';

import { Stack, Text } from '@mantine/core';
import { AssociationItem } from './AssociationItem';
import { type AssociationWithProfile } from '@/lib/models';
import { useAccountList } from '@/lib/use-account-list';

export function AssociationListClient({ 
  initialItems, 
  emptyMessage,
}: { 
  initialItems: AssociationWithProfile[];
  emptyMessage?: string;
}) {
  const { items, handleDelete, handleMove, handleRefresh } = useAccountList(initialItems);

  if (items.length === 0) {
    return emptyMessage ? (
      <Text c="dimmed" ta="center" py="xl">
        {emptyMessage}
      </Text>
    ) : null;
  }

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
