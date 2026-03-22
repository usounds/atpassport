'use client';

import { Card, Avatar, Text, Group, UnstyledButton, Stack, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslations } from 'next-intl';

export function AuthAccountItem({
  item,
  callback,
  atpstate,
  domain,
  onSelect,
  disabled,
  index = 0,
}: {
  item: any;
  callback: string;
  atpstate?: string;
  domain: string;
  onSelect: () => void;
  disabled?: boolean;
  index?: number;
}) {
  const t = useTranslations('Auth');

  const handleSelect = async () => {
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
      notifications.hide('auth-loading');
    }
  };

  const displayName = item.profile?.displayName || item.handle;
  const avatar = item.profile?.avatar;

  return (
    <Box className={`animate-slide-in stagger-${Math.min(index + 1, 10)}`}>
      <UnstyledButton
        component="div"
        onClick={handleSelect}
        style={{
          width: '100%',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : undefined,
        }}
      >
        <Card
          padding="sm"
          radius={0}
          className="picker-item picker-item-hoverable picker-item-slide"
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
                {new URL(item.pdsUrl).hostname}
              </Text>
            </Stack>
          </Group>
        </Card>
      </UnstyledButton>
    </Box>
  );
}
