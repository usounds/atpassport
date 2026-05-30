import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { appIndexPaths, baseUrl, contentIndexPaths, contentLocales } from '@/lib/seo';

function exactRobotsPath(locale: string, path: string) {
  return `/${locale}${path}$`;
}

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NEXT_PUBLIC_URL === 'https://atpassport.net';

  if (!isProduction) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  const appAllowPaths = routing.locales.flatMap((locale) =>
    appIndexPaths.map((path) => exactRobotsPath(locale, path))
  );
  const contentAllowPaths = contentLocales.flatMap((locale) =>
    contentIndexPaths.map((path) => exactRobotsPath(locale, path))
  );

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/robots.txt',
        '/sitemap.xml',
        '/_next/',
        '/favicon.ico',
        '/icon128.png',
        '/atpassportOgp.png',
        ...appAllowPaths,
        ...contentAllowPaths,
      ],
      disallow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
