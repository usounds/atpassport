import { Container } from '@mantine/core';
import { DeveloperPortal } from './DeveloperPortal';

export default async function DeveloperVerifyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <Container size="sm" py="xl">
      <DeveloperPortal locale={locale} />
    </Container>
  );
}
