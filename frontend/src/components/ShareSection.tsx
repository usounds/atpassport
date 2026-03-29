'use client';

import { useState, useEffect } from 'react';
import { Paper, Stack, Title, Text, Button, Group, Box, Flex } from '@mantine/core';
import { IconShare } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useTranslations } from 'next-intl';
import { ShareModal } from './ShareModal';

export function ShareSection() {
  const t = useTranslations('Home');
  const tShare = useTranslations('Share');
  const [opened, { open, close }] = useDisclosure(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  return (
    <>
    <Box 
      className={isMounted ? "animate-slide-in" : ""}
      style={{ opacity: isMounted ? 1 : 0 }}
    >
      <Paper 
        p="md" 
        radius="lg" 
        className="premium-card"
        style={{ overflow: 'hidden', position: 'relative' }}
      >
        <Flex 
          direction={{ base: 'column', sm: 'row' }} 
          justify="space-between" 
          align={{ base: 'stretch', sm: 'center' }} 
          gap="md"
        >
          <Stack gap={2}>
            <Group gap="xs">
              <IconShare size={20} color="var(--mantine-color-blue-6)" />
              <Title order={5} fw={700}>{t('share_title')}</Title>
            </Group>
            <Text size="xs" c="dimmed" lh={1.4} maw={{ base: '100%', sm: 300 }}>
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
            h="auto"
            py="xs"
            styles={{
              label: { whiteSpace: 'pre-line', textAlign: 'center' }
            }}
          >
            {tShare('title')}
          </Button>
        </Flex>
      </Paper>

      <ShareModal opened={opened} onClose={close} />
    </Box>
    </>
  );
}
