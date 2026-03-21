import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function getMarkdownContent(slug: string, locale: string) {
  let fullPath = path.join(process.cwd(), `src/content/${slug}/${locale}.md`);
  
  if (!fs.existsSync(fullPath)) {
    // Fallback to default locale if not found
    fullPath = path.join(process.cwd(), `src/content/${slug}/en.md`);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Content not found for ${slug}`);
    }
  }

  const { data, content } = matter.read(fullPath);

  return {
    data: data as { title: string; last_updated: string },
    content,
  };
}
