import { Container, Title, Text, Stack, Center } from '@mantine/core';
import { getTranslations } from 'next-intl/server';
import { AuthAccountList } from '@/components/AuthAccountList';
import { RegisterForm } from '@/components/RegisterForm';
import { getAssociations } from '@/lib/models';
import { getSessionUuid } from '@/lib/session';
import { getProfile } from '@/lib/atproto';

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callback?: string; atpstate?: string }>;
}) {
  const { locale } = await params;
  const { callback, atpstate } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'Auth' });

  if (!callback) {
    return (
      <Container size="sm" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Text c="red" size="lg">{t('missing_callback')}</Text>
        </Center>
      </Container>
    );
  }

  let domain = '';
  try {
    const url = new URL(callback);
    domain = url.hostname;
  } catch (e) {
    return (
      <Container size="sm" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Text c="red" size="lg">Invalid callback URL</Text>
        </Center>
      </Container>
    );
  }

  // Fetch associations on the server
  const uuid = await getSessionUuid();
  let items: any[] = [];
  if (uuid) {
    const associations = await getAssociations(uuid);
    items = await Promise.all(
      associations.map(async (assoc) => {
        const profile = await getProfile(assoc.did);
        return { ...assoc, profile };
      })
    );
  }

  return (
    <Container size="sm" py="xl" style={{ maxWidth: 500 }}>
      <Stack gap="xl">
        <header style={{ textAlign: 'center' }}>
          <Title order={3} mb="xs">{t('title')}</Title>
          <Text c="dimmed" size="xs" fw={500}>{t('moving_to', { domain })}</Text>
        </header>

        <AuthAccountList
          initialItems={items}
          callback={callback}
          atpstate={atpstate}
          domain={domain}
        />

        <RegisterForm handleCount={items.length} />
      </Stack>
    </Container>
  );
}
