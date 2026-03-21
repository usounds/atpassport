import { Container, Text, Stack, Paper, Divider } from '@mantine/core';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AssociationList } from '@/components/AssociationList';
import { RegisterForm } from '@/components/RegisterForm';
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
    <>
      <Header />
      <Container size="sm" py="xl">
        <Stack gap="xl">
          <Text c="dimmed" ta="center">{t('description')}</Text>

          <Divider label={t('registered_handles')} labelPosition="center" />

          <Suspense fallback={<Text ta="center">Loading...</Text>}>
            <AssociationList />
          </Suspense>

          <Paper withBorder p="md" radius="md">
            <RegisterForm handleCount={handleCount} />
          </Paper>

          <Footer />
        </Stack>
      </Container>
    </>
  );
}
