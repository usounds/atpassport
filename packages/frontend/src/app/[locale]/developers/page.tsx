import { permanentRedirect } from 'next/navigation';

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  permanentRedirect(`/${locale}/developers/verify`);
}
