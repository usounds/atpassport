import { Container, Title, Text, Stack, Divider, Alert } from '@mantine/core';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { AssociationList } from '@/components/AssociationList';
import { RegisterForm } from '@/components/RegisterForm';
import { ShareSection } from '@/components/ShareSection';
import { getAssociations } from '@/lib/models';
import { getSessionUuid } from '@/lib/session';
import { createPageMetadata } from '@/lib/seo';
import { IconInfoCircle } from '@tabler/icons-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });

  return createPageMetadata({
    locale,
    path: '',
    title: t('title'),
    description: t('description'),
  });
}

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
        {handleCount === 0 && (
          <Alert variant="light" color="blue" title="Notice" icon={<IconInfoCircle />} mb="md">
            {t('reset_notice')}
          </Alert>
        )}

        <header style={{ textAlign: 'center' }}>
          <Title order={3} mb="xs">{t('title')}</Title>
          <Text size="sm" className="text-pretty" style={{ lineHeight: 1.6, maxWidth: 460, margin: '0 auto' }}>
            {t('description')}
          </Text>
        </header>

        <Divider label={t('registered_handles')} labelPosition="center" />

        <Suspense fallback={<Text ta="center">Loading...</Text>}>
          <AssociationList />
        </Suspense>

        <RegisterForm handleCount={handleCount} />

        <ShareSection handleCount={handleCount} />
      </Stack>
    </Container>
  );
}
