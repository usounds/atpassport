import { Container, Stack, Title, Text, Divider, Paper } from '@mantine/core';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PickerList } from '@/components/PickerList';
import { RegisterForm } from '@/components/RegisterForm';
import { getAssociations } from '@/lib/models';
import { getSessionUuid } from '@/lib/session';

export default async function PickerPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });

  const uuid = await getSessionUuid();
  let handleCount = 0;
  if (uuid) {
    const associations = await getAssociations(uuid);
    handleCount = associations.length;
  }

  return (
    <Container size="xs" py="md">
      <Stack gap="md">
        <header>
          <Title order={3}>{t('registered_handles')}</Title>
        </header>

        <Suspense fallback={<Text ta="center">Loading...</Text>}>
          <PickerList />
        </Suspense>

        <Divider mt="md" />

        <Paper withBorder p="md" radius="md">
          <RegisterForm handleCount={handleCount} />
        </Paper>
      </Stack>
    </Container>
  );
}
