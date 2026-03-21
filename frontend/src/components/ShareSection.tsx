'use client';

import { Paper, Stack, Title, Text, Button, Group } from '@mantine/core';
import { IconShare } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations } from 'next-intl';
import { ShareModal } from './ShareModal';

export function ShareSection() {
  const t = useTranslations('Home');
  const tShare = useTranslations('Share');
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Paper withBorder p="xl" radius="md" bg="gray.0" style={{ borderStyle: 'dashed' }}>
        <Stack gap="md" align="center" ta="center">
          <Group gap="xs">
            <IconShare size={24} color="var(--mantine-color-blue-6)" />
            <Title order={4}>{t('share_title')}</Title>
          </Group>
          <Text size="sm" c="dimmed" style={{ maxWidth: 400 }}>
            {t('share_description')}
          </Text>
          <Button 
            variant="light" 
            onClick={open}
            leftSection={<IconShare size={18} />}
          >
            {tShare('title')}
          </Button>
        </Stack>
      </Paper>

      <ShareModal opened={opened} onClose={close} />
    </>
  );
}
