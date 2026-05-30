import { Badge, Container, Stack, Text, Title } from '@mantine/core';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { createPageMetadata } from '@/lib/seo';
import { getSeoContentLocale, seoContentLocales, supportedAppsPage } from '@/lib/seo-content';

export function generateStaticParams() {
  return seoContentLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = supportedAppsPage[getSeoContentLocale(locale)];

  return createPageMetadata({
    locale,
    path: '/supported-apps',
    title: page.title,
    description: page.description,
    index: seoContentLocales.includes(locale as (typeof seoContentLocales)[number]),
    alternateLocales: seoContentLocales,
  });
}

export default async function SupportedAppsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = supportedAppsPage[getSeoContentLocale(locale)];

  return (
    <Container size="sm" py={{ base: 'xl', sm: 56 }}>
      <Stack gap="xl">
        <header>
          <Badge variant="light" color="green" mb="sm">{page.eyebrow}</Badge>
          <Title order={1} size="h2">{page.title}</Title>
          <Text c="dimmed" mt="md" style={{ lineHeight: 1.7 }}>
            {page.intro}
          </Text>
        </header>

        <Stack gap="lg">
          {page.sections.map((section) => (
            <section key={section.title}>
              <Title order={2} size="h4" mb="xs">{section.title}</Title>
              <Text size="sm" style={{ lineHeight: 1.7 }}>{section.body}</Text>
              {section.items && (
                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                  {section.items.map((item) => (
                    <li key={item} style={{ fontSize: 'var(--mantine-font-size-sm)', lineHeight: 1.7 }}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </Stack>

        <Text size="sm" c="dimmed">
          <Link href="/directory">
            {locale === 'ja' ? '確認済みドメイン一覧を見る' : 'View verified domains'}
          </Link>
        </Text>
      </Stack>
    </Container>
  );
}
