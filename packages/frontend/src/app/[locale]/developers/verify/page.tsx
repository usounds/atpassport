import { Container, Loader, Center } from '@mantine/core';
import { DeveloperPortal } from './DeveloperPortal';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { noIndexMetadata } from '@/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Developers' });

  return {
    title: t('title'),
    description: t('description'),
    ...noIndexMetadata,
  };
}

export default async function DeveloperVerifyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <Container size="sm" py="xl">
      <Suspense fallback={<Center><Loader type="dots" /></Center>}>
        <DeveloperPortal locale={locale} />
      </Suspense>
    </Container>
  );
}
