'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Stack, Text, Group, ActionIcon, Tooltip, Center, Box, Loader, Paper } from '@mantine/core';
import { QRCodeSVG } from 'qrcode.react';
import { IconCopy, IconCheck, IconDeviceMobile } from '@tabler/icons-react';
import { useTranslations, useLocale } from 'next-intl';

export interface ShareModalProps {
  opened: boolean;
  onClose: () => void;
}

export function ShareModal({ opened, onClose }: ShareModalProps) {
  const t = useTranslations('Share');
  const locale = useLocale();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [rateError, setRateError] = useState(false);

  const generateToken = useCallback(async () => {
    setLoading(true);
    setRateError(false);
    try {
      const response = await fetch('/api/share/create', { method: 'POST' });
      
      if (response.status === 429) {
        setRateError(true);
        return;
      }

      const data = await response.json();
      if (data.token) {
        setToken(data.token);
        setTimeLeft(300); // 5 minutes
      }
    } catch (error) {
      console.error('Failed to generate sharing token', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (opened && !token && !loading) {
      const timer = setTimeout(() => generateToken(), 0);
      return () => clearTimeout(timer);
    }
  }, [opened, token, loading, generateToken]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (token) {
      const timer = setTimeout(() => setToken(null), 0);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, token]);

  const shareUrl = token ? `${window.location.origin}/${locale}/share/${token}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={t('title')} 
      size="sm"
      closeOnClickOutside={false}
    >
      <Stack align="center" py="md">
        {loading ? (
          <Stack align="center" py="xl">
            <Loader size="lg" variant="dots" color="blue.6" />
            <Text size="sm" c="dimmed" fw={500}>{t('generate')}...</Text>
          </Stack>
        ) : token ? (
          <Stack gap="xl" align="center" w="100%" className="animate-slide-in">
            <Paper 
              p="lg" 
              radius="lg" 
              withBorder 
              shadow="md"
              style={{ 
                backgroundColor: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: '4px solid var(--mantine-color-blue-0)'
              }}
            >
                <QRCodeSVG 
                  value={shareUrl} 
                  size={180} 
                  includeMargin={false} 
                  imageSettings={{
                    src: '/icon128.svg',
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
            </Paper>
            
            <Stack gap={4} align="center">
              <Text size="sm" fw={600} c="blue.7">
                {t('scanInstruction')}
              </Text>
              <Text size="xs" color="dimmed" ta="center" px="md">
                {t('description')}
              </Text>
            </Stack>

            <Stack gap="xs" w="100%">
              <Group gap={0} wrap="nowrap" style={{ 
                borderRadius: '12px', 
                overflow: 'hidden',
                border: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
                backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))' 
              }}>
                <Box px="md" py="xs" style={{ flex: 1, overflow: 'hidden' }}>
                  <Text size="xs" truncate color="dimmed" ff="monospace">
                    {shareUrl}
                  </Text>
                </Box>
                <Tooltip label={copied ? t('copied') : t('copyUrl')} withArrow>
                  <ActionIcon 
                    variant="filled" 
                    color={copied ? 'teal' : 'blue'} 
                    onClick={handleCopy} 
                    size="lg"
                    radius={0}
                    aria-label={t('copyUrl')}
                    style={{ height: '36px', width: '44px' }}
                  >
                    {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                  </ActionIcon>
                </Tooltip>
              </Group>

              <Center mt="xs">
                <Group gap={6} align="center">
                  <IconDeviceMobile size={14} style={{ color: 'var(--mantine-color-orange-6)' }} />
                  <Text size="xs" fw={500} c="orange.8" title={t('expiryNotice')}>
                    {t('expiryNotice')} ({formatTime(timeLeft)})
                  </Text>
                </Group>
              </Center>
            </Stack>
          </Stack>
        ) : rateError ? (
          <Stack align="center" py="md">
            <Text size="sm" color="red" ta="center" fw={500}>
              {t('rateLimitExceeded')}
            </Text>
            <Button variant="outline" onClick={generateToken} radius="md">
              {t('generate')}
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Modal>
  );
}
