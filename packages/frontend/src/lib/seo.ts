import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

export const baseUrl = 'https://atpassport.net';
export const appIndexPaths = ['', '/directory', '/developers/verify'] as const;
export const contentIndexPaths = [
  '/about',
  '/terms',
  '/privacy',
  '/guides/atproto-login',
  '/guides/bluesky-handle-login',
  '/guides/atproto-oauth-helper',
  '/supported-apps',
  '/developers/guide',
] as const;
export const contentLocales = ['en', 'ja'] as const;

export type SeoPath = (typeof appIndexPaths)[number] | (typeof contentIndexPaths)[number];

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
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
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
