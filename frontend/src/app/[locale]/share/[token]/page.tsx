'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, Text, Title, Button, Stack, Container, Center, Loader, Box, Paper } from '@mantine/core';
import { IconDeviceMobile } from '@tabler/icons-react';
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
        <Center style={{ height: '70vh' }}>
          <Stack align="center" gap="xl" className="animate-slide-in">
            <Loader size={60} variant="bars" color="blue.6" />
            <Stack gap={4} align="center">
              <Text 
                component="h3"
                variant="gradient" 
                gradient={{ from: 'blue.6', to: 'cyan.6', deg: 90 }}
                style={{ fontSize: 'var(--mantine-font-size-xl)', fontWeight: 800, margin: 0 }}
              >
                Syncing Devices
              </Text>
              <Text c="dimmed" fw={500}>ハンドル情報を同期しています...</Text>
            </Stack>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Center style={{ height: '70vh' }}>
          <Paper 
            withBorder 
            p="xl" 
            radius="lg" 
            className="premium-card"
            style={{ maxWidth: 400, width: '100%' }}
          >
            <Stack align="center" gap="lg">
              <Box 
                p="md" 
                style={{ 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--mantine-color-red-0)',
                  color: 'var(--mantine-color-red-6)'
                }}
              >
                <IconDeviceMobile size={40} />
              </Box>
              
              <Stack gap={4} align="center">
                <Title order={3} ta="center">{t('invalidTokenTitle')}</Title>
                <Text color="dimmed" ta="center" size="sm">
                  {t('invalidTokenDescription')}
                </Text>
              </Stack>

              <Button 
                onClick={() => router.push(`/${locale}`)} 
                variant="gradient"
                gradient={{ from: 'gray.6', to: 'gray.8', deg: 90 }}
                fullWidth
                radius="md"
                size="md"
              >
                {t('backToHome')}
              </Button>
            </Stack>
          </Paper>
        </Center>
      </Container>
    );
  }

  return null;
}
