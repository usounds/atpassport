'use client';

import { version } from '../../package.json';
import { Text, Anchor, Group, Divider, Stack } from '@mantine/core';
import { useTranslations } from 'next-intl';
import { FaGithub } from "react-icons/fa6";
import { FaBluesky } from "react-icons/fa6";

import { Link } from '@/i18n/routing';

export function Footer() {
  const t = useTranslations('Nav');

  return (
    <footer style={{ marginTop: 'auto', paddingTop: '2rem' }}>
      <Divider mb="sm" />
      <Stack align="center" gap="xs" pb="xl">
        <Group justify="center" align="center" gap="md" wrap="wrap">
          <Anchor component={Link} size="xs" c="dimmed" href="/developers/verify">
            {t('developers')}
          </Anchor>
          <Group gap={14} align="center">
            <Anchor
              c="dimmed"
              href="https://github.com/usounds/atpassport"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center' }}
              aria-label="GitHub"
            >
              <FaGithub size={16} style={{ transform: 'translateY(-2px)' }} />
            </Anchor>
            <Anchor
              c="dimmed"
              href="https://bsky.app/profile/atpassport.net"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center' }}
              aria-label="Bluesky"
            >
              <FaBluesky size={16} style={{ transform: 'translateY(-2px)' }} />
            </Anchor>
          </Group>
          <Text size="xs" c="dimmed">
            v{version}
          </Text>
        </Group>
        <Group justify="center" gap="xs">
          <Text size="xs" c="dimmed">
            Developed by usounds.work
          </Text>
        </Group>
      </Stack>
    </footer>
  );
}
