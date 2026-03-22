import { Container, Title, Text, Stack, Divider } from '@mantine/core';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { AssociationList } from '@/components/AssociationList';
import { RegisterForm } from '@/components/RegisterForm';
import { ShareSection } from '@/components/ShareSection';
import { getAssociations } from '@/lib/models';
import { getSessionUuid } from '@/lib/session';

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });

  // Fetch handle count for consent checkbox logic
  const uuid = await getSessionUuid();
  let handleCount = 0;
  if (uuid) {
    const associations = await getAssociations(uuid);
    handleCount = associations.length;
  }

  return (
    <Container size="sm" py="xl" style={{ maxWidth: 500 }}>
      <Stack gap="xl">
        <header style={{ textAlign: 'center' }}>
          <Title order={3} mb="xs">{t('title')}</Title>
          <Text c="dimmed" size="xs" fw={500}>{t('description')}</Text>
        </header>

        <Divider label={t('registered_handles')} labelPosition="center" />

        <Suspense fallback={<Text ta="center">Loading...</Text>}>
          <AssociationList />
        </Suspense>

        <RegisterForm handleCount={handleCount} />

        <ShareSection />
      </Stack>
    </Container>
  );
}
