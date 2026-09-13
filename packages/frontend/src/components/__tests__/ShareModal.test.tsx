// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@/test/utils';
import { ShareModal } from '../ShareModal';

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  return {
    ...actual,
    useLocale: () => 'en',
    useTranslations: () => (key: string) => ({
      title: 'Share with Other Devices',
      description: 'Share this URL.',
      generate: 'Generate Share Link',
      expiryNotice: 'This link is valid for 5 minutes.',
      rateLimitExceeded: 'Please try again.',
      shareUrl: 'Share URL',
      copied: 'Copied!',
      scanInstruction: 'Scan this with your smartphone camera.',
    })[key] ?? key,
  };
});

describe('ShareModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ token: 'share-token' }),
    }));
  });

  it('opens the system share menu with the generated URL', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: share,
    });

    render(<ShareModal opened onClose={vi.fn()} />);

    const shareButton = await screen.findByRole('button', { name: 'Share URL' });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(share).toHaveBeenCalledWith({
        url: 'http://localhost:3000/en/share/share-token',
      });
    });
  });
});
