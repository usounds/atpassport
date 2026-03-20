'use client';

import { Card, Avatar, Text, Group, Button, Stack } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export function AssociationItem({ item }: { item: any }) {
  const t = useTranslations('Home');
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Remove handle ${item.handle}?`)) return;

    try {
      const res = await fetch(`/api/delete?did=${item.did}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const displayName = item.profile?.displayName || item.handle;
  const avatar = item.profile?.avatar;

  return (
    <Card withBorder padding="md" radius="md">
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap">
          <Avatar src={avatar} radius="xl" size="lg" />
          <Stack gap={0}>
            <Text fw={500}>{displayName}</Text>
            <Text size="sm" c="dimmed">{item.handle}</Text>
          </Stack>
        </Group>
        <Button variant="subtle" color="red" onClick={handleDelete} aria-label={t('delete')}>
          <IconTrash size={18} />
        </Button>
      </Group>
    </Card>
  );
}
