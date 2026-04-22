'use client';

import { Box, Group, Avatar, Text, Card, ActionIcon, Menu, Modal, Button } from '@mantine/core';
import {
  IconChevronUp,
  IconChevronDown,
  IconTrash,
  IconRefresh,
  IconDotsVertical
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { type AssociationWithProfile } from '@/lib/models';

export function AssociationItem({
  item,
  onMoveUp,
  onMoveDown,
  onDelete,
  onRefresh,
  isFirst,
  isLast,
  index = 0
}: {
  item: AssociationWithProfile;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  index?: number;
}) {
  const t = useTranslations('Home');
  const [opened, { open, close }] = useDisclosure(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const handleRefresh = async () => {
    setIsUpdating(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setIsUpdating(false);
    }
  };

  const [menuOpened, setMenuOpened] = useState(false);
  const displayName = item.profile?.displayName || item.handle;
  const avatar = item.profile?.avatar;

  let pdsHostname = '';
  try {
    pdsHostname = new URL(item.pdsUrl).hostname;
  } catch {
    pdsHostname = item.pdsUrl;
  }

  return (
    <>
      <Box 
        className={isMounted ? `animate-slide-in stagger-${Math.min(index + 1, 10)}` : ''}
        style={{ opacity: isMounted ? 1 : 0 }}
      >
        <Group gap="md" align="center" wrap="nowrap" style={{ minWidth: 0 }}>
          <Box style={{ flex: 1, opacity: isUpdating ? 0.6 : undefined, minWidth: 0 }}>
            <Card
              padding="sm"
              radius={0}
              className={`picker-item ${!menuOpened ? 'picker-item-hoverable picker-item-scale' : ''}`}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
              }}
            >
              <Group wrap="nowrap" justify="space-between" align="center" style={{ minWidth: 0 }}>
                <Group wrap="nowrap" gap="md" align="center" style={{ flex: 1, minWidth: 0 }}>
                  <Avatar src={avatar} radius="xl" size="md" />
                  <Box style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                    <Text fw={500} size="sm" truncate="end">{displayName}</Text>
                    <Text size="xs" c="dimmed" truncate="end">
                      @{item.handle}
                    </Text>
                    <Text fz={10} lh={1.2} pb={1} c="dimmed" truncate="end" style={{ opacity: 0.8 }}>
                      PDS:{pdsHostname}
                    </Text>
                  </Box>
                </Group>

                <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                  <Menu
                    shadow="md"
                    width={200}
                    position="bottom-end"
                    radius="md"
                    opened={menuOpened}
                    onChange={setMenuOpened}
                  >
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" size="lg" radius="md" loading={isUpdating}>
                        <IconDotsVertical size={20} />
                      </ActionIcon>
                    </Menu.Target>

                    <Menu.Dropdown>
                      <Menu.Label>{t('manage_handle')}</Menu.Label>

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
                        onClick={() => handleRefresh()}
                      >
                        {t('refresh_metadata')}
                      </Menu.Item>

                      <Menu.Divider />

                      <Menu.Item
                        color="red"
                        leftSection={<IconTrash size={16} />}
                        onClick={() => handleDelete()}
                      >
                        {t('delete')}
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Group>
            </Card>
          </Box>
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
