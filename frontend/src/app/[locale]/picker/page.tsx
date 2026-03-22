import { Container, Title, Stack, Text, Center } from '@mantine/core';
import { getTranslations } from 'next-intl/server';
import { getAssociations } from '@/lib/models';
import { getSessionUuid } from '@/lib/session';
import { getProfile } from '@/lib/atproto';
import { PickerList } from '@/components/PickerList';

export default async function PickerPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Auth' });
  const tHome = await getTranslations({ locale, namespace: 'Home' });

  const uuid = await getSessionUuid();
  if (!uuid) {
    return (
      <Center style={{ height: '100vh' }}>
        <Text c="dimmed">No active session</Text>
      </Center>
    );
  }

  const associations = await getAssociations(uuid);
  const items = await Promise.all(
    associations.map(async (assoc) => {
      const profile = await getProfile(assoc.did).catch(() => null);
      return { ...assoc, profile };
    })
  );

  return (
    <Container size="xs" py="md">
      <Stack gap="md">
        <header style={{ textAlign: 'center' }}>
          <Title order={4}>{t('title')}</Title>
        </header>

        {items.length === 0 ? (
          <Text ta="center" py="xl" c="dimmed">
            {tHome('no_handles')}
          </Text>
        ) : (
          <PickerList items={items} />
        )}
      </Stack>
    </Container>
  );
}
