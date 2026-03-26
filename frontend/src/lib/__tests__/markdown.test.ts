import { describe, it, expect, vi } from 'vitest';
import { getMarkdownContent } from '../markdown';
import fs from 'fs';
import matter from 'gray-matter';

vi.mock('fs');
vi.mock('gray-matter');

describe('Markdown Library', () => {
  it('should read and return markdown content', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(matter.read).mockReturnValue({
      data: { title: 'Test Title', last_updated: '2024-01-01' },
      content: '# Test Content',
    } as unknown as ReturnType<typeof matter.read>);

    const result = await getMarkdownContent('test-slug', 'en');

    expect(result.data.title).toBe('Test Title');
    expect(result.content).toBe('# Test Content');
  });

  it('should fallback to English if locale not found', async () => {
    vi.mocked(fs.existsSync).mockImplementation((path: string | Buffer | URL) => {
      // Return false for Japanese, true for English
      return !path.toString().endsWith('ja.md');
    });
    vi.mocked(matter.read).mockReturnValue({
      data: { title: 'English Title', last_updated: '2024-01-01' },
      content: '# English Content',
    } as unknown as ReturnType<typeof matter.read>);

    const result = await getMarkdownContent('test-slug', 'ja');

    expect(result.data.title).toBe('English Title');
  });

  it('should throw error if content not found at all', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    await expect(getMarkdownContent('none', 'en')).rejects.toThrow('Content not found for none');
  });
});
