'use client';

import { Button, Checkbox, Stack, Box, Text } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { registerHandle } from '@/lib/actions';
import { Link } from '@/i18n/routing';
import { notifications } from '@mantine/notifications';

export function AddHandleClient({
  handle,
  did,
  pdsUrl,
  callback,
  atpstate,
  isAlreadyRegistered,
  needsConsent,
}: {
  handle: string;
  did: string;
  pdsUrl: string;
  callback?: string;
  atpstate?: string;
  isAlreadyRegistered: boolean;
  needsConsent: boolean;
}) {
  const t = useTranslations('Add');
  const tHome = useTranslations('Home');
  const tAuth = useTranslations('Auth');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (needsConsent && !agreed) return;
    setLoading(true);

    try {
      if (!isAlreadyRegistered) {
        const res = await registerHandle(handle);
        if (!res.success) {
          throw new Error(res.error || 'Failed to register');
        }
      }

      if (callback) {
        notifications.show({
          message: tAuth('authenticating', { domain: new URL(callback).hostname }),
          loading: true,
          autoClose: false,
          withCloseButton: false,
        });

        const url = new URL(callback);
        url.searchParams.set('handle', handle);
        url.searchParams.set('did', did);
        url.searchParams.set('pdsurl', pdsUrl);
        if (atpstate) {
          url.searchParams.set('atpstate', atpstate);
        }
        window.location.replace(url.toString());
      } else {
        notifications.show({
          message: t('success', { handle }),
          color: 'green',
        });
        window.location.href = '/';
      }
    } catch (e: any) {
      console.error('Registration failed:', e);
      notifications.show({
        message: e.message || 'Registration failed',
        color: 'red',
      });
      setLoading(false);
    }
  };

  if (isAlreadyRegistered && !callback) {
    return (
      <Stack gap="md">
        <Text c="dimmed" ta="center" size="sm">
          {t('already_registered')}
        </Text>
        <Button component={Link} href="/" variant="light" fullWidth radius="md">
          {tHome('manage_handle')}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {needsConsent && (
        <Box>
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
            size="sm"
          />
        </Box>
      )}

      <Button
        onClick={handleRegister}
        loading={loading}
        disabled={needsConsent && !agreed}
        fullWidth
        radius="md"
      >
        {callback ? t('register_and_continue') : t('register_only')}
      </Button>
    </Stack>
  );
}
