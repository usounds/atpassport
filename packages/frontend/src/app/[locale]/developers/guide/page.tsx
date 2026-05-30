import { Badge, Container, Stack, Text, Title } from '@mantine/core';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { createPageMetadata } from '@/lib/seo';
import { developerGuidePage, getSeoContentLocale, seoContentLocales } from '@/lib/seo-content';

export function generateStaticParams() {
  return seoContentLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = developerGuidePage[getSeoContentLocale(locale)];

  return createPageMetadata({
    locale,
    path: '/developers/guide',
    title: page.title,
    description: page.description,
    index: seoContentLocales.includes(locale as (typeof seoContentLocales)[number]),
    alternateLocales: seoContentLocales,
  });
}

export default async function DeveloperGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = developerGuidePage[getSeoContentLocale(locale)];

  return (
    <Container size="sm" py={{ base: 'xl', sm: 56 }}>
      <Stack gap="xl">
        <header>
          <Badge variant="light" color="violet" mb="sm">{page.eyebrow}</Badge>
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
          <Link href="/developers/verify">
            {locale === 'ja' ? 'ドメイン所有権を確認する' : 'Verify your domain'}
          </Link>
        </Text>
      </Stack>
    </Container>
  );
}
