'use client';

import React, { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import type { AuthenticationOptionsJSON } from '@simplewebauthn/server';
import { 
  getPasskeyAuthenticationOptionsAction, 
  verifyPasskeyAuthenticationAction 
} from '@/lib/actions';
import { Button } from '@mantine/core';
import { IconFingerprint } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export const PasskeyLogin = () => {
  const t = useTranslations('Passkeys');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      // 1. Get options from server
      const options = await getPasskeyAuthenticationOptionsAction();

      // 2. Start browser-level WebAuthn authentication
      const authResponse = await startAuthentication({ optionsJSON: options as AuthenticationOptionsJSON });

      // 3. Verify with server
      const verificationResult = await verifyPasskeyAuthenticationAction(authResponse);

      if (verificationResult.success) {
        notifications.show({
          title: t('loginSuccessTitle'),
          message: t('loginSuccessMessage'),
          color: 'green',
        });
        router.refresh(); // Refresh to update session state
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: unknown) {
      console.error('Passkey authentication error:', error);
      if (error instanceof Error && error.name !== 'NotAllowedError') {
        notifications.show({
          title: t('loginErrorTitle'),
          message: error.message || t('loginErrorMessage'),
          color: 'red',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      fullWidth 
      leftSection={<IconFingerprint size={20} />} 
      onClick={handleLogin}
      loading={loading}
      size="md"
    >
      {t('loginButton')}
    </Button>
  );
};
