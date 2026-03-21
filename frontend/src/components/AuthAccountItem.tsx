'use client';

import { Card, Avatar, Text, Group, UnstyledButton, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslations } from 'next-intl';

export function AuthAccountItem({
  item,
  callback,
  atpstate,
  domain,
  onSelect,
  disabled
}: {
  item: any;
  callback: string;
  atpstate?: string;
  domain: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations('Auth');

  const handleSelect = () => {
    if (disabled) return;

    // Show notification
    notifications.show({
      id: 'auth-loading',
      message: t('authenticating', { domain }),
      loading: true,
      autoClose: false,
      withCloseButton: false,
      color: 'indigo',
    });

    onSelect();

    try {
      const url = new URL(callback);
      url.searchParams.set('handle', item.handle);
      url.searchParams.set('did', item.did);
      url.searchParams.set('pdsurl', item.pdsUrl);
      if (atpstate) {
        url.searchParams.set('atpstate', atpstate);
      }
      window.location.replace(url.toString());
    } catch (e) {
      console.error('Failed to construct callback URL', e);
      notifications.hide('auth-loading');
    }
  };

  const displayName = item.profile?.displayName || item.handle;
  const avatar = item.profile?.avatar;

  return (
    <UnstyledButton
      component="div"
      onClick={handleSelect}
      style={{
        width: '100%',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Card
        padding="sm"
        radius={0}
        className="picker-item picker-item-hoverable"
        style={{
          backgroundColor: 'transparent',
          border: 'none',
        }}
      >
        <Group wrap="nowrap" gap="md" align="center">
          <Avatar src={avatar} radius="xl" size="md" />
          <Stack gap={0} style={{ flex: 1, overflow: 'hidden' }}>
            <Text fw={500} size="sm" truncate>{displayName}</Text>
            <Text size="xs" c="dimmed" truncate>
              {item.handle} ({item.did})
            </Text>
            <Text size="10px" c="dimmed" truncate style={{ opacity: 0.8 }}>
              {item.pdsUrl}
            </Text>
          </Stack>
        </Group>
      </Card>
    </UnstyledButton>
  );
}
