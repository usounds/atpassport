import { describe, it, expect, vi } from 'vitest';
import { getMarkdownContent } from '../markdown';
import fs from 'fs';

vi.mock('fs');

describe('Markdown Library', () => {
  it('should read and return markdown content', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('---\ntitle: Test Title\nlast_updated: 2024-01-01\n---\n# Test Content');

    const result = await getMarkdownContent('test-slug', 'en');

    expect(result.data.title).toBe('Test Title');
    expect(result.content).toBe('# Test Content');
  });

  it('should fallback to English if locale not found', async () => {
    vi.mocked(fs.existsSync).mockImplementation((path: string | Buffer | URL) => {
      // Return false for Japanese, true for English
      return !path.toString().endsWith('ja.md');
    });
    vi.mocked(fs.readFileSync).mockReturnValue('---\ntitle: English Title\nlast_updated: 2024-01-01\n---\n# English Content');

    const result = await getMarkdownContent('test-slug', 'ja');

    expect(result.data.title).toBe('English Title');
  });

  it('should throw error if content not found at all', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    try {
      await getMarkdownContent('none', 'en');
      expect.fail('Should have thrown error');
    } catch (e: any) {
      expect(e.message).toContain('Content not found for none');
    }
  });

  it('should sanitize slug and prevent path traversal', async () => {
    // sanitizedSlug will be 'directory'
    // sanitizedLocale will be 'en'
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('Safe');
    
    await getMarkdownContent('../../../etc/passwd', 'en');
    
    // Check if fs.existsSync was called with sanitized path
    // The path will be .../src/content/etcpasswd/en.md (because non-alphanum are removed)
    // Actually the regex is [^a-zA-Z0-9_-] so / and . are removed.
    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('src/content/etcpasswd/en.md'));
  });
});
