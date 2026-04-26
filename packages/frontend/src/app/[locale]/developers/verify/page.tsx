import { Container, Loader, Center } from '@mantine/core';
import { DeveloperPortal } from './DeveloperPortal';
import { Suspense } from 'react';

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
