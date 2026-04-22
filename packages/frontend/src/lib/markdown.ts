import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function getMarkdownContent(slug: string, locale: string) {
  const sanitizedSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '');
  const sanitizedLocale = locale.replace(/[^a-zA-Z0-9_-]/g, '');

  let fullPath = path.join(process.cwd(), `src/content/${sanitizedSlug}/${sanitizedLocale}.md`);
  
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(process.cwd(), `src/content/${sanitizedSlug}/en.md`);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Content not found for ${slug}`);
    }
  }

  const contentDir = path.join(process.cwd(), 'src/content');
  if (!fullPath.startsWith(contentDir)) {
    throw new Error(`Invalid content path: ${slug}`);
  }

  const { data, content } = matter.read(fullPath);

  return {
    data: data as { title: string; last_updated: string },
    content,
  };
}
