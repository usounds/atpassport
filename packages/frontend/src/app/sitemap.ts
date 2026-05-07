import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://atpassport.net';
  const locales = ['en', 'ja'];
  const paths = ['', '/about', '/directory', '/developers/verify', '/terms', '/privacy'];

  const sitemapData: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of paths) {
      sitemapData.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: path === '' ? 1 : path === '/about' ? 0.9 : 0.8,
      });
    }
  }

  return sitemapData;
}
