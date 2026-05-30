import { Container, Title, Text, Stack } from '@mantine/core';
import { getTranslations } from 'next-intl/server';
import { getPublicVerifiedDomains } from '@/lib/security';
import { createPageMetadata } from '@/lib/seo';
import DirectoryClient from './DirectoryClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Directory' });

  return createPageMetadata({
    locale,
    path: '/directory',
    title: t('title'),
    description: t('description'),
  });
}

export default async function DirectoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Directory' });
  const domains = await getPublicVerifiedDomains();

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <header>
          <Title order={2}>{t('title')}</Title>
          <Text c="dimmed" size="sm" mt="xs">
            {t('description')}
          </Text>
        </header>

        <DirectoryClient 
          initialDomains={domains} 
          translations={{
            no_domains: t('no_domains')
          }} 
        />
      </Stack>
    </Container>
  );
}
