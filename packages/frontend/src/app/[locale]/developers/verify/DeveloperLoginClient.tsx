'use client';

import { TextInput, Button, Stack, Alert } from '@mantine/core';
import { IconInfoCircle, IconLogin } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { initOAuth } from '@/lib/oauth';
import { createAuthorizationUrl, finalizeAuthorization } from '@atcute/oauth-browser-client';
import { registerHandle, initializeSession } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export function DeveloperLoginClient() {
  const t = useTranslations('Developers');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    initOAuth();
    
    const checkCallback = async () => {
      if (typeof window !== 'undefined' && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        if (params.has('state')) {
          setLoading(true);
          try {
            const { session } = await finalizeAuthorization(params);
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            
            // @atpassport のセッションを初期化し、ハンドルを登録する
            await initializeSession();
            
            // session.info.sub (DID) を直接使用し、resolveIdentity 経由で登録
            const res = await registerHandle(session.info.sub); 
            
            if (res.success) {
              router.refresh();
            }
          } catch (e: unknown) {
            console.error('Login callback failed:', e);
          } finally {
            setLoading(false);
          }
        }
      }
    };
    
    checkCallback();
  }, [router]);

  const handleLogin = async () => {
    if (!handle) return;
    setLoading(true);
    try {
      const authUrl = await createAuthorizationUrl({
        target: { type: 'account', identifier: handle as `${string}.${string}` },
        scope: 'atproto',
      });
      await new Promise(resolve => setTimeout(resolve, 200));
      window.location.assign(authUrl);
    } catch (e: unknown) {
      console.error('OAuth start failed:', e);
      setLoading(false);
    }
  };

  return (
    <Stack gap="md">
      <Alert icon={<IconInfoCircle size={16} />} title={t('auth_required')} color="blue">
        {t('auth_required_description')}
      </Alert>
      <TextInput
        placeholder="example.bsky.social"
        label={t('login_handle')}
        value={handle}
        onChange={(e) => setHandle(e.currentTarget.value)}
      />
      <Button 
        onClick={handleLogin} 
        loading={loading}
        leftSection={<IconLogin size={16} />}
      >
        {t('login_with_oauth')}
      </Button>
    </Stack>
  );
}
