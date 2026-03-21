'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, Text, Title, Button, Stack, Container, Center, Loader } from '@mantine/core';
import { syncWithToken } from '@/lib/actions';

interface PageProps {
  params: Promise<{
    locale: string;
    token: string;
  }>;
}

export default function ShareSyncPage({ params }: PageProps) {
  const { locale, token } = use(params);
  const t = useTranslations('ShareSync');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function performSync() {
      try {
        const result = await syncWithToken(token, locale);
        if (result.success) {
          // Force a hard reload to ensure fresh request to server
          window.location.href = `/${locale}`;
        } else {
          setError(result.error || 'unknown_error');
          setLoading(false);
        }
      } catch (err) {
        console.error('Sync error:', err);
        setError('connection_error');
        setLoading(false);
      }
    }

    performSync();
  }, [token, locale, router]);

  if (loading) {
    return (
      <Container size="sm" py="xl">
        <Center style={{ height: '50vh' }}>
          <Stack align="center">
            <Loader size="xl" />
            <Text color="dimmed">同期しています...</Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Card withBorder shadow="sm" p="xl" radius="md">
          <Stack align="center">
            <Title order={2}>{t('invalidTokenTitle')}</Title>
            <Text color="dimmed" ta="center">
              {t('invalidTokenDescription')}
            </Text>
            <Button onClick={() => router.push(`/${locale}`)} variant="light">
              {t('backToHome')}
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return null;
}
