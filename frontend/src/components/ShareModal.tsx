'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Stack, Text, Group, ActionIcon, Tooltip, Title, Center, Box, Loader } from '@mantine/core';
import { QRCodeSVG } from 'qrcode.react';
import { IconCopy, IconCheck, IconShare, IconDeviceMobile } from '@tabler/icons-react';
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

  const generateToken = async () => {
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
        setTimeLeft(600); // 10 minutes
      }
    } catch (error) {
      console.error('Failed to generate sharing token', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened && !token && !loading) {
      generateToken();
    }
  }, [opened]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (token) {
      setToken(null);
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
    <Modal opened={opened} onClose={onClose} title={t('title')} centered size="sm" p="md">
      <Stack align="center" py="md">
        {loading ? (
          <Stack align="center" py="xl">
            <Loader size="lg" />
            <Text size="sm" color="dimmed">{t('generate')}...</Text>
          </Stack>
        ) : token ? (
          <>
            <Box p="md" bg="gray.0" style={{ borderRadius: '12px' }}>
              <QRCodeSVG value={shareUrl} size={200} includeMargin={true} />
            </Box>
            
            <Text size="sm" color="dimmed" ta="center">
              {t('scanInstruction')}
            </Text>

            <Group gap="xs" w="100%">
              <Box style={{ flex: 1, overflow: 'hidden' }}>
                <Text size="xs" truncate color="dimmed" p="xs" bg="gray.1" style={{ borderRadius: '4px' }}>
                  {shareUrl}
                </Text>
              </Box>
              <Tooltip label={copied ? t('copied') : t('copyUrl')} withArrow>
                <ActionIcon variant="light" color={copied ? 'teal' : 'blue'} onClick={handleCopy} size="lg">
                  {copied ? <IconCheck size={20} /> : <IconCopy size={20} />}
                </ActionIcon>
              </Tooltip>
            </Group>

            <Text size="xs" color="orange" fw={500}>
              {t('expiryNotice')} ({formatTime(timeLeft)})
            </Text>
          </>
        ) : rateError ? (
          <Stack align="center" py="md">
            <Text size="sm" color="red" ta="center">
              {t('rateLimitExceeded')}
            </Text>
            <Button variant="light" onClick={generateToken}>
              {t('generate')}
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Modal>
  );
}
