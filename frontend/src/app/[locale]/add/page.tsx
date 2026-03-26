import { Container, Title, Text, Stack, Center, Paper, Group, Avatar } from '@mantine/core';
import { getTranslations } from 'next-intl/server';
import { getAssociations } from '@/lib/models';
import { getSessionUuid } from '@/lib/session';
import { getProfile, BskyProfile } from '@/lib/atproto';
import { resolveIdentity } from '@/lib/atproto-server';
import { AddHandleClient } from './AddHandleClient';

export default async function AddPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ handle?: string; callback?: string; atpstate?: string }>;
}) {
  const { locale } = await params;
  const { handle, callback, atpstate } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'Add' });

  if (!handle) {
    return (
      <Container size="sm" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Text c="red" size="lg">{t('invalid_handle')}</Text>
        </Center>
      </Container>
    );
  }

  const resolved = await resolveIdentity(handle);
  if (!resolved) {
    return (
      <Container size="sm" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Text c="red" size="lg">{t('invalid_handle')}</Text>
        </Center>
      </Container>
    );
  }

  const uuid = await getSessionUuid();
  let isAlreadyRegistered = false;
  let handleCount = 0;
  if (uuid) {
    const associations = await getAssociations(uuid);
    isAlreadyRegistered = associations.some(a => a.did === resolved.did);
    handleCount = associations.length;
  }

  const profile: BskyProfile | null = await getProfile(resolved.did);

  return (
    <Container size="sm" py="xl" style={{ maxWidth: 500 }}>
      <Stack gap="xl">
        <header style={{ textAlign: 'center' }}>
          <Title order={3} mb="xs">{t('title')}</Title>
          <Text c="dimmed" size="sm">
            {t('description', { handle: resolved.handle })}
          </Text>
        </header>

        <Paper withBorder p="xl" radius="lg">
          <Stack gap="lg">
            <Group wrap="nowrap" gap="md">
              <Avatar src={profile?.avatar} size="lg" radius="xl" />
              <Stack gap={0} style={{ flex: 1, overflow: 'hidden' }}>
                <Text fw={600} size="lg" truncate>{profile?.displayName || resolved.handle}</Text>
                <Text size="sm" c="dimmed" truncate>@{resolved.handle}</Text>
              </Stack>
            </Group>

            <AddHandleClient 
              handle={resolved.handle}
              did={resolved.did}
              pdsUrl={resolved.pdsUrl}
              callback={callback}
              atpstate={atpstate}
              isAlreadyRegistered={isAlreadyRegistered}
              needsConsent={handleCount === 0}
            />
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
