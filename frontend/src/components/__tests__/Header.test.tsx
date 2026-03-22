// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { Header } from '../Header';

// Mock routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  usePathname: () => '/',
}));

// Add missing translations for Nav
vi.mock('next-intl', async () => {
  const actual = await vi.importActual('next-intl');
  return {
    ...actual,
    useTranslations: (namespace: string) => (key: string) => {
      if (namespace === 'Nav') return key;
      if (key === 'title') return 'AtPassport';
      return key;
    }
  };
});

describe('Header', () => {
  it('renders logo and navigation links', () => {
    render(<Header />);
    expect(screen.getByText('AtPassport')).toBeInTheDocument();
    expect(screen.getByText('about')).toBeInTheDocument();
    expect(screen.getByText('terms')).toBeInTheDocument();
    expect(screen.getByText('privacy')).toBeInTheDocument();
  });
});
