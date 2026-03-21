import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export async function getMarkdownContent(slug: string, locale: string) {
  const fullPath = path.join(process.cwd(), `src/content/${slug}/${locale}.md`);
  
  if (!fs.existsSync(fullPath)) {
    // Fallback to default locale if not found
    const defaultPath = path.join(process.cwd(), `src/content/${slug}/en.md`);
    if (!fs.existsSync(defaultPath)) {
      throw new Error(`Content not found for ${slug}`);
    }
    const fileContents = fs.readFileSync(defaultPath, 'utf8');
    const { data, content } = matter(fileContents);
    return { data, content };
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    data: data as { title: string; last_updated: string },
    content,
  };
}
