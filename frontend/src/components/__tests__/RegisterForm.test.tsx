// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { RegisterForm } from '../RegisterForm';
import * as actions from '@/lib/actions';

// Mock navigation
vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
    redirect: vi.fn(),
    usePathname: () => '/',
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
    }),
  }),
}));

// Mock routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock Server Actions
vi.mock('@/lib/actions', () => ({
  registerHandle: vi.fn(),
}));

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<RegisterForm />);
    expect(screen.getByText('Add Handle')).toBeInTheDocument();
  });

  it('opens modal and allows typing handle', async () => {
    render(<RegisterForm handleCount={1} />);
    
    fireEvent.click(screen.getByText('Add Handle'));
    
    // Find input by placeholder
    const input = await screen.findByPlaceholderText(/e\.g\./i);
    fireEvent.change(input, { target: { value: 'test.bsky.social' } });
    
    expect(input).toHaveValue('test.bsky.social');
  });

  it('shows checkbox when no handles are registered', async () => {
    render(<RegisterForm handleCount={0} />);
    
    fireEvent.click(screen.getByText('Add Handle'));
    
    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('calls registerHandle when button is clicked', async () => {
    vi.mocked(actions.registerHandle).mockResolvedValue({ success: true });
    
    render(<RegisterForm handleCount={1} />);
    
    fireEvent.click(screen.getByText('Add Handle'));
    
    const input = await screen.findByPlaceholderText(/e\.g\./i);
    fireEvent.change(input, { target: { value: 'test.bsky.social' } });
    
    const registerBtn = screen.getByText('Register');
    fireEvent.click(registerBtn);
    
    await waitFor(() => {
      expect(actions.registerHandle).toHaveBeenCalledWith('test.bsky.social');
    });
  });
});
