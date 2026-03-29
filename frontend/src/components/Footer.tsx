import { version } from '../../package.json';
import { Text, Anchor, Group, Divider, Stack } from '@mantine/core';
import { useTranslations, useLocale } from 'next-intl';

export function Footer() {
  const t = useTranslations('Nav');
  const locale = useLocale();

  return (
    <footer style={{ marginTop: 'auto', paddingTop: '2rem' }}>
      <Divider mb="sm" />
      <Stack align="center" gap="xs" pb="xl">
        <Group justify="center" gap="xs" wrap="wrap">
          <Anchor size="xs" c="dimmed" href={`/${locale}/developers/verify`}>
            {t('developers')}
          </Anchor>
          <Text size="xs" c="dimmed">|</Text>
          <Anchor
            size="xs"
            c="dimmed"
            href="https://github.com/usounds/atpassport"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub v{version}
          </Anchor>
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
