// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { Header } from '../Header';
import { useMantineColorScheme } from '@mantine/core';
import { useRouter } from '@/i18n/routing';

// Mock routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
  usePathname: () => '/',
  useRouter: vi.fn(() => ({
    replace: vi.fn(),
    push: vi.fn(),
  })),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock mantine core
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  return {
    ...actual,
    useMantineColorScheme: vi.fn(() => ({
      colorScheme: 'light',
      setColorScheme: vi.fn(),
    })),
  };
});

// Mock next-intl
vi.mock('next-intl', async () => {
  const actual = await vi.importActual('next-intl');
  return {
    ...actual,
    useTranslations: (namespace: string) => (key: string) => {
      if (namespace === 'Nav') return key;
      if (key === 'title') return '@passport';
      return key;
    },
    useLocale: () => 'en',
  };
});

describe('Header', () => {
  it('renders logo and navigation links', () => {
    render(<Header />);
    expect(screen.getByText('@passport')).toBeInTheDocument();
  });

  it('toggles color scheme', async () => {
    const setColorScheme = vi.fn();
    vi.mocked(useMantineColorScheme).mockReturnValue({
      colorScheme: 'light',
      setColorScheme,
      clearColorScheme: vi.fn(),
      toggleColorScheme: vi.fn(),
    });

    render(<Header />);
    const toggleBtns = screen.getAllByLabelText(/toggle_color_scheme/i);
    fireEvent.click(toggleBtns[0]);
    expect(setColorScheme).toHaveBeenCalledWith('dark');
  });

  it('handles locale change', async () => {
    const mockReplace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      replace: mockReplace,
      push: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    } as ReturnType<typeof useRouter>);

    render(<Header />);
    
    // Open language menu
    const langBtns = screen.getAllByLabelText('change_language');
    fireEvent.click(langBtns[0]);

    // Select Japanese
    const jaOption = await screen.findByText('日本語');
    fireEvent.click(jaOption);

    expect(mockReplace).toHaveBeenCalledWith('/', { locale: 'ja' });
  });

  it('toggles mobile menu when burger is clicked', async () => {
    render(<Header />);
    const burger = screen.getByLabelText(/toggle navigation/i);
    fireEvent.click(burger);
    await waitFor(() => {
      expect(screen.getAllByText('about').length).toBeGreaterThan(1);
    });
  });
});
