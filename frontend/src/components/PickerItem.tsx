'use client';

import { Card, Avatar, Text, Group, UnstyledButton, Stack, ActionIcon, Tooltip, Modal, Button } from '@mantine/core';
import { IconChevronUp, IconChevronDown, IconTrash, IconRefresh } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations } from 'next-intl';
import { removeAssociation, moveAssociation, refreshAssociation } from '@/lib/actions';
import { useState } from 'react';

export function PickerItem({ item, selectable = true }: { item: any, selectable?: boolean }) {
  const t = useTranslations('Home');
  const [opened, { open, close }] = useDisclosure(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelect = () => {
    if (!selectable) return;
    if (window.opener) {
      window.opener.postMessage(
        { type: 'atpassport:pick', handle: item.handle },
        '*'
      );
      window.close();
    }
  };

  const onRemove = async () => {
    setIsUpdating(true);
    await removeAssociation(item.did).finally(() => {
      setIsUpdating(false);
      close();
    });
  };

  const onMove = async (e: React.MouseEvent, direction: 'up' | 'down') => {
    e.stopPropagation();
    setIsUpdating(true);
    await moveAssociation(item.did, direction).finally(() => setIsUpdating(false));
  };

  const onRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsUpdating(true);
    await refreshAssociation(item.did).finally(() => setIsUpdating(false));
  };

  const displayName = item.profile?.displayName || item.handle;
  const avatar = item.profile?.avatar;

  return (
    <>
      <Group gap="md" align="center" wrap="nowrap">
        <UnstyledButton
          component="div"
          onClick={handleSelect}
          style={{
            flex: 1,
            cursor: selectable ? 'pointer' : 'default',
            opacity: isUpdating ? 0.6 : 1,
          }}
        >
          <Card
            withBorder
            padding="md"
            radius="md"
            className={selectable ? 'picker-item-hover' : ''}
            style={{
              backgroundColor: 'transparent',
              transition: 'background-color 0.2s ease',
            }}
          >
            <Group wrap="nowrap" justify="space-between" align="center">
              <Group wrap="nowrap" gap="md" align="center">
                <Avatar src={avatar} radius="xl" size="md" />
                <Stack gap={0} style={{ flex: 1, overflow: 'hidden' }}>
                  <Text fw={500} size="sm" truncate>{displayName}</Text>
                  <Text size="xs" c="dimmed" truncate>
                    {item.handle} ({item.did})
                  </Text>
                  <Text size="10px" c="dimmed" truncate style={{ opacity: 0.8 }}>
                    PDS: {item.pdsUrl}
                  </Text>
                </Stack>
              </Group>
              
              <Tooltip label={t('refresh_metadata')}>
                <ActionIcon 
                  variant="subtle" 
                  color="blue" 
                  onClick={onRefresh}
                  loading={isUpdating}
                >
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Card>
        </UnstyledButton>

        <Stack gap={4}>
          <Tooltip label={t('move_up')}>
            <ActionIcon 
              variant="subtle" 
              color="gray" 
              onClick={(e) => onMove(e, 'up')}
              loading={isUpdating}
            >
              <IconChevronUp size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('move_down')}>
            <ActionIcon 
              variant="subtle" 
              color="gray" 
              onClick={(e) => onMove(e, 'down')}
              loading={isUpdating}
            >
              <IconChevronDown size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('delete')}>
            <ActionIcon 
              variant="subtle" 
              color="red" 
              onClick={(e) => { e.stopPropagation(); open(); }}
              loading={isUpdating}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Stack>
      </Group>

      <Modal opened={opened} onClose={close} title={t('confirm_delete_title')} centered>
        <Text size="sm" mb="lg">
          {t('confirm_delete_text', { handle: item.handle })}
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={close}>{t('cancel')}</Button>
          <Button color="red" onClick={onRemove} loading={isUpdating}>{t('delete')}</Button>
        </Group>
      </Modal>
    </>
  );
}
