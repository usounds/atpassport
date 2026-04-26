'use client';

import { Stack, Text, Loader, Center } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { initOAuth } from '@/lib/oauth';
import { createAuthorizationUrl, finalizeAuthorization } from '@atcute/oauth-browser-client';
import { isActorIdentifier } from '@atcute/lexicons/syntax';

export function CallbackHandler({
  locale,
  parsedHandle,
}: {
  locale: string;
  parsedHandle: string | null;
}) {
  const t = useTranslations('Developers');
  const router = useRouter();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    initOAuth();

    const processCallback = async () => {
      // 1. #state がある → PDS からの OAuth コールバック
      if (typeof window !== 'undefined' && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        if (params.has('state')) {
          try {
            await finalizeAuthorization(params);
            // セッション確立成功 → verify ページへリダイレクト
            router.replace(`/${locale}/developers/verify`);
            return;
          } catch (e: unknown) {
            console.error('OAuth callback failed:', e);
            router.replace(`/${locale}/developers/verify`);
            return;
          }
        }
      }

      // 2. parsedHandle がある → AtPassport からの戻り、OAuth を開始
      if (parsedHandle) {
        if (!isActorIdentifier(parsedHandle)) {
          router.replace(`/${locale}/developers/verify`);
          return;
        }

        try {
          const scope = 'atproto include:net.atpassport.permissionSet';
          const authUrl = await createAuthorizationUrl({
            target: {
              type: 'account',
              identifier: parsedHandle,
            },
            scope: scope,
            prompt: 'consent',
          });
          // PDS へリダイレクト
          window.location.assign(authUrl);
        } catch (e: unknown) {
          console.error('OAuth start failed:', e);
          router.replace(`/${locale}/developers/verify`);
        }
        return;
      }

      // 3. どちらもない → verify ページに戻す
      router.replace(`/${locale}/developers/verify`);
    };

    processCallback();
  }, [locale, parsedHandle, router, t]);

  return (
    <Center style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'var(--mantine-color-body)',
      zIndex: 1000,
      textAlign: 'center',
    }}>
      <Stack align="center" gap="md">
        <Loader size={50} variant="bars" color="blue" />
        <Text fw={600} size="xl">{t('authenticating_title')}</Text>
        <Text size="sm" c="dimmed">
          {t('authenticating_message', { domain: 'atproto', pds: 'PDS' })}
        </Text>
      </Stack>
    </Center>
  );
}
