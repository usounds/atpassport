'use client';

import { Paper, Stack, Title, Text, Button, Group, Box } from '@mantine/core';
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
    <Box className="animate-slide-in">
      <Paper 
        p="md" 
        radius="lg" 
        className="premium-card"
        style={{ overflow: 'hidden', position: 'relative' }}
      >
        <Group justify="space-between" align="center" wrap="nowrap">
          <Stack gap={2} style={{ flex: 1 }}>
            <Group gap="xs">
              <IconShare size={20} color="var(--mantine-color-blue-6)" />
              <Title order={5} fw={700}>{t('share_title')}</Title>
            </Group>
            <Text size="xs" c="dimmed" lh={1.4} style={{ maxWidth: 300 }}>
              {t('share_description')}
            </Text>
          </Stack>
          
          <Button 
            variant="gradient"
            gradient={{ from: 'blue.6', to: 'cyan.6', deg: 90 }}
            onClick={open}
            size="sm"
            radius="md"
            leftSection={<IconShare size={16} />}
            px="md"
          >
            {tShare('title')}
          </Button>
        </Group>
      </Paper>

      <ShareModal opened={opened} onClose={close} />
    </Box>
    </>
  );
}
