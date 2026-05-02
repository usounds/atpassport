'use client';

import React, { useState, useEffect } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import type { RegistrationOptionsJSON } from '@simplewebauthn/server';
import { 
  getPasskeyRegistrationOptionsAction, 
  verifyPasskeyRegistrationAction,
  getMyPasskeysAction 
} from '@/lib/actions';
import { Button, Card, Text, Group, Stack, Badge, Loader } from '@mantine/core';
import { IconFingerprint, IconDeviceMobile, IconPlus, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslations } from 'next-intl';

export const PasskeyManager = () => {
  const t = useTranslations('Passkeys');
  const [passkeys, setPasskeys] = useState<{ credentialID: string; createdAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const fetchPasskeys = React.useCallback(async () => {
    try {
      const result = await getMyPasskeysAction();
      setPasskeys(result);
    } catch (error) {
      console.error('Failed to fetch passkeys:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const result = await getMyPasskeysAction();
      if (active) {
        setPasskeys(result);
        setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      // 1. Get options from server
      const options = await getPasskeyRegistrationOptionsAction();

      // 2. Start browser-level WebAuthn registration
      const registrationResponse = await startRegistration({ optionsJSON: options as RegistrationOptionsJSON });

      // 3. Verify with server
      const verificationResult = await verifyPasskeyRegistrationAction(registrationResponse);

      if (verificationResult.success) {
        notifications.show({
          title: t('registrationSuccessTitle'),
          message: t('registrationSuccessMessage'),
          color: 'green',
          icon: <IconCheck size={18} />,
        });
        fetchPasskeys();
      } else {
        throw new Error(verificationResult.error || 'Verification failed');
      }
    } catch (error: unknown) {
      console.error('Passkey registration error:', error);
      if (error instanceof Error && error.name !== 'NotAllowedError') { // User cancelled
        notifications.show({
          title: t('registrationErrorTitle'),
          message: error.message || t('registrationErrorMessage'),
          color: 'red',
        });
      }
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <Loader size="sm" />;

  return (
    <Card withBorder padding="lg" radius="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <IconFingerprint size={24} style={{ color: 'var(--mantine-color-blue-filled)' }} />
            <Text fw={700} size="lg">{t('title')}</Text>
          </Group>
          <Button 
            variant="light" 
            leftSection={<IconPlus size={16} />} 
            onClick={handleRegister}
            loading={registering}
          >
            {t('registerButton')}
          </Button>
        </Group>

        <Text size="sm" c="dimmed">
          {t('description')}
        </Text>

        {passkeys.length === 0 ? (
          <Text size="sm" fs="italic" c="dimmed" py="xs">
            {t('noPasskeys')}
          </Text>
        ) : (
          <Stack gap="xs">
            {passkeys.map((pk) => (
              <Group key={pk.credentialID} justify="space-between" p="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                <Group gap="sm">
                  <IconDeviceMobile size={20} />
                  <div>
                    <Text size="sm" fw={500}>
                      {t('passkeyLabel', { id: pk.credentialID.slice(0, 8) })}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {new Date(pk.createdAt).toLocaleString()}
                    </Text>
                  </div>
                </Group>
                <Badge variant="dot" color="blue">{t('activeBadge')}</Badge>
              </Group>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
};
