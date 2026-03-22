'use client';

import { Card, Avatar, Text, Group, UnstyledButton, Stack, Box, Checkbox, Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { registerHandle } from '@/lib/actions';
import { Link } from '@/i18n/routing';

export function AuthSuggestedAccountItem({
  item,
  callback,
  atpstate,
  domain,
  onSelect,
  disabled,
  needsConsent
}: {
  item: any;
  callback: string;
  atpstate?: string;
  domain: string;
  onSelect: () => void;
  disabled?: boolean;
  needsConsent?: boolean;
}) {
  const t = useTranslations('Auth');
  const tHome = useTranslations('Home');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSelect = async () => {
    if (disabled || loading) return;
    if (needsConsent && !agreed) return;

    setLoading(true);
    onSelect();

    // Show notification
    notifications.show({
      id: 'auth-loading',
      message: t('authenticating', { domain }),
      loading: true,
      autoClose: false,
      withCloseButton: false,
      color: 'indigo',
    });

    try {
      const res = await registerHandle(item.handle);
      if (!res.success) {
        throw new Error(res.error || 'Failed to register');
      }

      const url = new URL(callback);
      url.searchParams.set('handle', item.handle);
      url.searchParams.set('did', item.did);
      url.searchParams.set('pdsurl', item.pdsUrl);
      if (atpstate) {
        url.searchParams.set('atpstate', atpstate);
      }
      window.location.replace(url.toString());
    } catch (e: any) {
      console.error('Failed to register and auth', e);
      notifications.update({
        id: 'auth-loading',
        message: e.message || 'Authentication failed',
        color: 'red',
        loading: false,
        autoClose: 5000,
        withCloseButton: true,
      });
      setLoading(false);
    }
  };

  const displayName = item.profile?.displayName || item.handle;
  const avatar = item.profile?.avatar;

  return (
    <Box className="animate-slide-in" mb="md">
      <Stack gap="xs">
        <Text size="xs" fw={700} c="blue" tt="uppercase" px="sm">
          {t('confirm_registration')}
        </Text>
        <UnstyledButton
          component="div"
          onClick={handleSelect}
          style={{
            width: '100%',
            cursor: (disabled || (needsConsent && !agreed)) ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : undefined,
          }}
        >
          <Card
            padding="sm"
            radius="md"
            className="picker-item-hoverable"
            style={{
              border: '2px solid var(--mantine-color-blue-filled)',
              backgroundColor: 'var(--mantine-color-blue-light)',
            }}
          >
            <Group wrap="nowrap" gap="md" align="center" style={{ minWidth: 0 }}>
              <Avatar src={avatar} radius="xl" size="md" />
              <Stack gap={0} style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                <Text fw={600} size="sm" truncate>{displayName}</Text>
                <Text size="xs" c="dimmed" truncate>
                  @{item.handle}
                </Text>
              </Stack>
            </Group>
          </Card>
        </UnstyledButton>

        {needsConsent && (
          <Box px="sm">
            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.currentTarget.checked)}
              label={tHome.rich('agree_to_terms', {
                terms: (chunks) => (
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-blue-6)' }}>
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mantine-color-blue-6)' }}>
                    {chunks}
                  </Link>
                ),
              })}
              size="xs"
            />
          </Box>
        )}
        
        <Button 
          fullWidth 
          variant="filled" 
          color="blue" 
          onClick={handleSelect}
          loading={loading}
          disabled={disabled || (needsConsent && !agreed)}
          radius="md"
        >
          {t('register_and_auth', { handle: item.handle })}
        </Button>
      </Stack>
    </Box>
  );
}
