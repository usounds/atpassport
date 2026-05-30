import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { appIndexPaths, baseUrl, contentIndexPaths, contentLocales, localizedAlternates } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemapData: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    for (const path of appIndexPaths) {
      sitemapData.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: path === '' ? 1 : 0.8,
        alternates: {
          languages: localizedAlternates(path),
        },
      });
    }
  }

  for (const locale of contentLocales) {
    for (const path of contentIndexPaths) {
      sitemapData.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: path === '/about' || path === '/developers/guide' ? 0.9 : 0.7,
        alternates: {
          languages: localizedAlternates(path, contentLocales),
        },
      });
    }
  }

  return sitemapData;
}
