import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

export const baseUrl = 'https://atpassport.net';
export const ogImage = {
  url: '/atpassportOgp.png',
  width: 1200,
  height: 630,
  alt: '@passport',
} as const;
export const appIndexPaths = ['', '/directory'] as const;
export const contentIndexPaths = [
  '/about',
  '/terms',
  '/privacy',
  '/developers/guide',
] as const;
export const contentLocales = ['en', 'ja'] as const;

export type SeoPath = (typeof appIndexPaths)[number] | (typeof contentIndexPaths)[number];

export const sitemapLastModified: Record<SeoPath, string> = {
  '': '2026-05-30',
  '/directory': '2026-05-30',
  '/about': '2026-04-26',
  '/terms': '2026-03-29',
  '/privacy': '2026-03-29',
  '/developers/guide': '2026-05-30',
};

export function localizedAlternates(
  path: SeoPath,
  locales: readonly string[] = routing.locales
) {
  return {
    ...Object.fromEntries(
      locales.map((alternateLocale) => [
        alternateLocale,
        `${baseUrl}/${alternateLocale}${path}`,
      ])
    ),
    'x-default': `${baseUrl}/en${path}`,
  };
}

export function createPageMetadata({
  locale,
  path,
  title,
  description,
  index = true,
  alternateLocales = routing.locales,
}: {
  locale: string;
  path: SeoPath;
  title: string;
  description: string;
  index?: boolean;
  alternateLocales?: readonly string[];
}): Metadata {
  const url = `/${locale}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: localizedAlternates(path, alternateLocales),
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage.url],
    },
    robots: {
      index,
      follow: index,
    },
  };
}

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
