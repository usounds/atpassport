'use client';

import { Card, Avatar, Text, Group, UnstyledButton, Stack, Box, ActionIcon, Menu, Modal, Button } from '@mantine/core';
import {
  IconDotsVertical,
  IconRefresh,
  IconChevronUp,
  IconChevronDown,
  IconTrash
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations } from 'next-intl';
import { useTopLoader } from 'nextjs-toploader';
import { useState } from 'react';
import { type AssociationWithProfile } from '@/lib/models';

export function AuthAccountItem({
  item,
  callback,
  atpstate,
  onSelect,
  onRefresh,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  disabled,
  selected,
  index = 0,
  hideMenu,
}: {
  item: AssociationWithProfile;
  callback: string;
  atpstate?: string;
  onSelect: (item: AssociationWithProfile) => void;
  onRefresh?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  disabled?: boolean;
  selected?: boolean;
  index?: number;
  hideMenu?: boolean;
}) {
  const t = useTranslations('Auth');
  const topLoader = useTopLoader();
  const [opened, { open, close }] = useDisclosure(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [menuOpened, setMenuOpened] = useState(false);

  const pdsHostname = (() => {
    try {
      return new URL(item.pdsUrl).hostname;
    } catch {
      return item.pdsUrl;
    }
  })();

  const handleSelect = async () => {
    if (disabled || isUpdating) return;

    // Show top loader
    topLoader.start();

    onSelect(item);

    try {
      // Callback mode (default)
      const url = new URL(callback);
      url.searchParams.set('handle', item.handle);
      url.searchParams.set('did', item.did);
      url.searchParams.set('pdsurl', item.pdsUrl);
      if (atpstate) {
        url.searchParams.set('atpstate', atpstate);
      }
      window.location.replace(url.toString());
    } catch (e) {
      console.error('Failed to construct redirect URL', e);
    }
  };

  const handleRefresh = async () => {
    setIsUpdating(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    open();
  };

  const confirmDelete = async () => {
    setIsUpdating(true);
    try {
      if (onDelete) await onDelete();
    } finally {
      setIsUpdating(false);
      close();
    }
  };

  const handleMove = async (direction: 'up' | 'down') => {
    setIsUpdating(true);
    try {
      if (direction === 'up' && onMoveUp) await onMoveUp();
      if (direction === 'down' && onMoveDown) await onMoveDown();
    } finally {
      setIsUpdating(false);
    }
  };

  const displayName = item.profile?.displayName || item.handle;
  const avatar = item.profile?.avatar;

  return (
    <>
      <Box className={`animate-slide-in stagger-${Math.min(index + 1, 10)}`}>
        <Group wrap="nowrap" gap={0} align="center">
          <UnstyledButton
            component="div"
            onClick={handleSelect}
            style={{
              flex: 1,
              cursor: (disabled || isUpdating) ? 'not-allowed' : 'pointer',
              opacity: ((disabled || isUpdating) && !selected) ? 0.6 : undefined,
              minWidth: 0,
            }}
          >
            <Card
              padding="sm"
              radius={0}
              className={`picker-item ${(!menuOpened && !disabled && !isUpdating) ? 'picker-item-hoverable picker-item-slide' : ''}`}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
              }}
            >
              <Group wrap="nowrap" gap="md" align="center" style={{ minWidth: 0 }}>
                <Avatar src={avatar} radius="xl" size="md" />
                <Stack gap={0} style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                  <Text fw={500} size="sm" truncate>{displayName}</Text>
                  <Text size="xs" c="dimmed" truncate>
                    @{item.handle}
                  </Text>
                  <Text size="10px" c="dimmed" truncate style={{ opacity: 0.8 }}>
                    PDS:{pdsHostname}
                  </Text>
                </Stack>
              </Group>
            </Card>
          </UnstyledButton>

          {!hideMenu && (
            <Box pr="xs">
              <Menu
                shadow="md"
                width={200}
                position="bottom-end"
                radius="md"
                opened={menuOpened}
                onChange={setMenuOpened}
              >
                <Menu.Target>
                  <ActionIcon 
                    variant="subtle" 
                    color="gray" 
                    size="lg" 
                    radius="md" 
                    loading={isUpdating}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconDotsVertical size={20} />
                  </ActionIcon>
                </Menu.Target>

                <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
                  <Menu.Label>{t('manage_account')}</Menu.Label>

                  <Menu.Item
                    leftSection={<IconChevronUp size={16} />}
                    onClick={() => handleMove('up')}
                    disabled={isFirst}
                  >
                    {t('move_up')}
                  </Menu.Item>

                  <Menu.Item
                    leftSection={<IconChevronDown size={16} />}
                    onClick={() => handleMove('down')}
                    disabled={isLast}
                  >
                    {t('move_down')}
                  </Menu.Item>

                  <Menu.Item
                    leftSection={<IconRefresh size={16} />}
                    onClick={handleRefresh}
                  >
                    {t('refresh_metadata')}
                  </Menu.Item>

                  <Menu.Divider />

                  <Menu.Item
                    color="red"
                    leftSection={<IconTrash size={16} />}
                    onClick={handleDelete}
                  >
                    {t('delete')}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Box>
          )}
        </Group>
      </Box>

      <Modal
        opened={opened}
        onClose={close}
        title={t('confirm_delete_title')}
        closeOnClickOutside={false}
      >
        <Text size="sm" mb="lg">
          {t('confirm_delete_text', { handle: item.handle })}
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="subtle" onClick={close}>{t('cancel')}</Button>
          <Button color="red" onClick={confirmDelete} loading={isUpdating}>{t('delete')}</Button>
        </Group>
      </Modal>
    </>
  );
}
