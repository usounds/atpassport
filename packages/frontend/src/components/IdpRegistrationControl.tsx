'use client';

import { useState, useSyncExternalStore } from 'react';
import { Button, Group, Text, Collapse, Badge, Paper, Stack, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBrowser, IconCheck, IconChevronDown, IconChevronUp, IconX } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import {
  hasIdpRegistrationSupport,
  registerIdp,
  unregisterIdp,
} from '@/lib/fedcm-session-client';

const emptySubscribe = () => () => {};

export function IdpRegistrationControl() {
  const t = useTranslations('Home');
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  const supported = useSyncExternalStore(
    emptySubscribe,
    hasIdpRegistrationSupport,
    () => false
  );

  const handleRegister = async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const res = await registerIdp();
      if (res.success) {
        notifications.show({
          title: t('idp_registration_title'),
          message: t('idp_register_success'),
          color: 'green',
          icon: <IconCheck size={16} />,
        });
      } else {
        notifications.show({
          title: t('idp_registration_title'),
          message: t('idp_action_failed', { error: res.error || 'Failed' }),
          color: 'red',
          icon: <IconX size={16} />,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const res = await unregisterIdp();
      if (res.success) {
        notifications.show({
          title: t('idp_registration_title'),
          message: t('idp_unregister_success'),
          color: 'blue',
          icon: <IconCheck size={16} />,
        });
      } else {
        notifications.show({
          title: t('idp_registration_title'),
          message: t('idp_action_failed', { error: res.error || 'Failed' }),
          color: 'red',
          icon: <IconX size={16} />,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="xs" radius="md" withBorder style={{ opacity: 0.9 }}>
      <Group
        justify="space-between"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpened((o) => !o)}
      >
        <Group gap="xs">
          <IconBrowser size={16} style={{ opacity: 0.7 }} />
          <Text size="xs" fw={500}>
            {t('idp_registration_title')}
          </Text>
          <Badge size="xs" variant="light" color="violet">
            Experimental
          </Badge>
        </Group>
        {opened ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
      </Group>

      <Collapse expanded={opened}>
        <Stack gap="xs" mt="xs" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <Text size="xs" c="dimmed">
            {t('idp_registration_desc')}
          </Text>

          {!supported && (
            <Text size="xs" c="dimmed" fs="italic">
              {t('idp_not_supported')}
            </Text>
          )}

          <Group gap="xs" mt={4}>
            <Tooltip label={t('idp_not_supported')} disabled={supported}>
              <span tabIndex={supported ? undefined : 0} style={{ display: 'inline-block' }}>
                <Button
                  size="xs"
                  variant="light"
                  color="violet"
                  onClick={handleRegister}
                  loading={loading}
                  disabled={!supported}
                >
                  {t('idp_register_button')}
                </Button>
              </span>
            </Tooltip>
            <Tooltip label={t('idp_not_supported')} disabled={supported}>
              <span tabIndex={supported ? undefined : 0} style={{ display: 'inline-block' }}>
                <Button
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={handleUnregister}
                  loading={loading}
                  disabled={!supported}
                >
                  {t('idp_unregister_button')}
                </Button>
              </span>
            </Tooltip>
          </Group>
        </Stack>
      </Collapse>
    </Paper>
  );
}
