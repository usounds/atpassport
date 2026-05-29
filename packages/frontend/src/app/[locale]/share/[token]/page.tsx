'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Text, Title, Button, Stack, Container, Center, Box, Paper, Group, Badge, Loader } from '@mantine/core';
import { IconDeviceMobile, IconAlertCircle, IconCheck, IconShield } from '@tabler/icons-react';
import { RefreshCw } from 'lucide-react';
import { syncWithToken, checkShareTokenValidity } from '@/lib/actions';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    let active = true;
    async function validate() {
      try {
        const isValid = await checkShareTokenValidity(token);
        if (!active) return;
        if (!isValid) {
          setError('invalid_token');
        }
      } catch (err) {
        console.error('Failed to validate token:', err);
        if (active) {
          setError('connection_error');
        }
      } finally {
        if (active) {
          setIsValidating(false);
        }
      }
    }
    validate();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const result = await syncWithToken(token);
      if (result.success) {
        setSuccess(true);
        // Delay a bit to show success state before redirecting
        setTimeout(() => {
          window.location.href = `/${locale}`;
        }, 1000);
      } else {
        setError(result.error || 'unknown_error');
        setIsSyncing(false);
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError('connection_error');
      setIsSyncing(false);
    }
  };

  if (isValidating) {
    return (
      <Container size="sm" py="xl">
        <Center style={{ height: '70vh' }}>
          <Stack align="center" gap="md">
            <Loader size="lg" color="blue" />
            <Text c="dimmed" size="sm">
              {locale === 'ja' ? 'セキュア接続を確認中...' : 'Verifying secure connection...'}
            </Text>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (success) {
    return (
      <Container size="sm" py="xl">
        <Center style={{ height: '70vh' }}>
          <Stack align="center" gap="xl" className="animate-fade-in">
            <Box 
              p="md" 
              style={{ 
                borderRadius: '50%', 
                backgroundColor: 'var(--mantine-color-green-0)',
                color: 'var(--mantine-color-green-6)'
              }}
            >
              <IconCheck size={60} />
            </Box>
            <Title order={2}>{t('syncing')}</Title>
          </Stack>
        </Center>
      </Container>
    );
  }

  if (error) {
    const isInvalidToken = error === 'invalid_token';
    return (
      <Container size="sm" py="xl">
        <Center style={{ height: '70vh' }}>
          <Paper 
            withBorder 
            p="xl" 
            radius="lg" 
            className="premium-card"
            style={{ maxWidth: 400, width: '100%', position: 'relative', overflow: 'hidden' }}
          >
            <Stack align="center" gap="lg">
              <Box 
                p="md" 
                style={{ 
                  borderRadius: '50%', 
                  backgroundColor: isInvalidToken ? 'var(--mantine-color-blue-0)' : 'var(--mantine-color-red-0)',
                  color: isInvalidToken ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-red-6)'
                }}
              >
                {isInvalidToken ? <IconShield size={40} /> : <IconDeviceMobile size={40} />}
              </Box>
              
              <Stack gap={4} align="center">
                {isInvalidToken && (
                  <Badge variant="light" color="blue" size="xs" radius="sm" mb="xs">
                    {locale === 'ja' ? '安全のため無効化済み' : 'Deactivated for security'}
                  </Badge>
                )}
                <Title order={3} ta="center">{t('invalidTokenTitle')}</Title>
                <Text c="dimmed" ta="center" size="sm">
                  {t('invalidTokenDescription')}
                </Text>
              </Stack>

              <Button 
                onClick={() => router.push(`/${locale}`)} 
                variant="light"
                color="gray"
                fullWidth
                radius="md"
              >
                {t('backToHome')}
              </Button>
            </Stack>
          </Paper>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl">
      <Center style={{ height: '70vh' }}>
        <Paper 
          withBorder 
          p="xl" 
          radius="lg" 
          shadow="md"
          style={{ maxWidth: 450, width: '100%', position: 'relative', overflow: 'hidden' }}
          className="animate-slide-in"
        >
          <Stack gap="xl">
            <Group>
              <Badge variant="gradient" gradient={{ from: 'blue', to: 'cyan', deg: 90 }} size="sm" radius="sm">
                {locale === 'ja' ? '🛡️ セキュア同期（1回限り有効）' : '🛡️ Secure Sync (One-time only)'}
              </Badge>
            </Group>

            <Group wrap="nowrap" align="flex-start">
              <Box 
                p="sm" 
                style={{ 
                  borderRadius: '12px', 
                  backgroundColor: 'var(--mantine-color-blue-0)',
                  color: 'var(--mantine-color-blue-6)'
                }}
              >
                <IconDeviceMobile size={32} />
              </Box>
              <Stack gap={4}>
                <Title order={3}>{t('confirmTitle')}</Title>
                <Text size="sm" c="dimmed">{t('title')}</Text>
              </Stack>
            </Group>

            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-orange-0)" style={{ borderColor: 'var(--mantine-color-orange-2)' }}>
              <Group wrap="nowrap" align="flex-start" gap="sm">
                <IconAlertCircle size={20} color="var(--mantine-color-orange-6)" style={{ flexShrink: 0, marginTop: 2 }} />
                <Text size="sm" c="orange.9" fw={500}>
                  {t('confirmDescription')}
                </Text>
              </Group>
            </Paper>

            <Stack gap="sm">
              <Button 
                onClick={handleSync} 
                loading={isSyncing}
                size="md"
                radius="md"
                fullWidth
                variant="filled"
                color="blue"
                leftSection={<RefreshCw size={18} />}
              >
                {t('syncButton')}
              </Button>
              <Button 
                variant="subtle" 
                color="gray" 
                onClick={() => router.push(`/${locale}`)}
                disabled={isSyncing}
              >
                {t('backToHome')}
              </Button>

              <Text size="xs" c="dimmed" ta="center" mt="xs">
                {locale === 'ja' ? '🔒 すべての同期通信は暗号化され安全に保護されます' : '🔒 All sync communications are securely encrypted'}
              </Text>
            </Stack>
          </Stack>
        </Paper>
      </Center>
    </Container>
  );
}
