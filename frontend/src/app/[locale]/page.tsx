import { Container, Title, Text, Stack, Paper, Divider } from '@mantine/core';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { AssociationList } from '@/components/AssociationList';
import { RegisterForm } from '@/components/RegisterForm';

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <header>
          <Title order={1}>{t('title')}</Title>
          <Text c="dimmed">{t('description')}</Text>
        </header>

        <Divider label={t('registered_handles')} labelPosition="center" />

        <Suspense fallback={<Text ta="center">Loading...</Text>}>
          <AssociationList />
        </Suspense>

        <Paper withBorder p="md" radius="md">
          <RegisterForm />
        </Paper>
      </Stack>
    </Container>
  );
}
