// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { Header } from '../Header';

// Mock routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
  usePathname: () => '/',
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock next-intl
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

  it('toggles mobile menu when burger is clicked', async () => {
    render(<Header />);
    
    // Find burger by aria-label
    const burger = screen.getByLabelText(/toggle navigation/i);
    fireEvent.click(burger);
    
    // Links should be rendered in the mobile menu (drawer)
    // Use waitFor because Drawer might have a slight delay or animation
    await waitFor(() => {
      const mobileLinks = screen.getAllByText('about');
      expect(mobileLinks.length).toBeGreaterThan(1);
    });
  });
});
