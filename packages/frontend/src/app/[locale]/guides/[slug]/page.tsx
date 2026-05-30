import { notFound } from 'next/navigation';
import { Badge, Container, Stack, Text, Title } from '@mantine/core';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { createPageMetadata, type SeoPath } from '@/lib/seo';
import { getSeoContentLocale, guidePages, seoContentLocales, type GuideSlug } from '@/lib/seo-content';

const guideSlugs = Object.keys(guidePages) as GuideSlug[];

export function generateStaticParams() {
  return seoContentLocales.flatMap((locale) =>
    guideSlugs.map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!guideSlugs.includes(slug as GuideSlug)) {
    return {};
  }

  const page = guidePages[slug as GuideSlug][getSeoContentLocale(locale)];

  return createPageMetadata({
    locale,
    path: `/guides/${slug}` as SeoPath,
    title: page.title,
    description: page.description,
    index: seoContentLocales.includes(locale as (typeof seoContentLocales)[number]),
    alternateLocales: seoContentLocales,
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  if (!guideSlugs.includes(slug as GuideSlug)) {
    notFound();
  }

  const page = guidePages[slug as GuideSlug][getSeoContentLocale(locale)];

  return (
    <Container size="sm" py={{ base: 'xl', sm: 56 }}>
      <Stack gap="xl">
        <header>
          <Badge variant="light" color="blue" mb="sm">{page.eyebrow}</Badge>
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
          <Link href="/developers/guide">
            {locale === 'ja' ? '開発者向け実装ガイドを見る' : 'Read the developer implementation guide'}
          </Link>
        </Text>
      </Stack>
    </Container>
  );
}
