// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { RegisterForm } from '../RegisterForm';
import * as actions from '@/lib/actions';
import { publicAgent } from '@/lib/atproto';

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
  Link: ({ children, href, target }: { children: React.ReactNode; href: string; target?: string }) => <a href={href} target={target}>{children}</a>,
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Mock Server Actions
vi.mock('@/lib/actions', () => ({
  registerHandle: vi.fn(),
  initializeSession: vi.fn(),
}));

// Mock atproto
vi.mock('@/lib/atproto', () => ({
  publicAgent: {
    get: vi.fn(),
  },
}));

// Mock atcute/client's ok
vi.mock('@atcute/client', () => ({
  ok: vi.fn().mockImplementation(async (promise) => {
    const res = await promise;
    return res;
  }),
}));

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<RegisterForm />);
    // Translation mock returns "Add Handle"
    expect(screen.getByText(/add handle/i)).toBeInTheDocument();
  });

  it('opens modal and allows typing handle', async () => {
    render(<RegisterForm handleCount={1} />);
    
    fireEvent.click(screen.getByText(/add handle/i));
    
    // Find input by role and name
    const input = await screen.findByRole('textbox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'test.bsky.social' } });
    
    expect(input).toHaveValue('test.bsky.social');
  });

  it('shows checkbox when no handles are registered', async () => {
    render(<RegisterForm handleCount={0} />);
    
    fireEvent.click(screen.getByText(/add handle/i));
    
    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
  });

  it('initializes session when checkbox is clicked', async () => {
    render(<RegisterForm handleCount={0} />);
    
    fireEvent.click(screen.getByText(/add handle/i));
    
    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(actions.initializeSession).toHaveBeenCalled();
  });

  it('calls registerHandle when button is clicked with consent', async () => {
    vi.mocked(actions.registerHandle).mockResolvedValue({ success: true });
    
    render(<RegisterForm handleCount={0} />);
    
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('textbox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'test.bsky.social' } });
    
    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);
    
    const registerBtn = screen.getByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    await waitFor(() => {
      expect(actions.registerHandle).toHaveBeenCalledWith('test.bsky.social');
    });
  });

  it('shows error message when registration fails', async () => {
    vi.mocked(actions.registerHandle).mockResolvedValue({ 
      success: false, 
      error: "Handle not found or missing PDS" 
    });
    
    render(<RegisterForm handleCount={1} />);
    
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('textbox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'invalid' } });
    
    const registerBtn = screen.getByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    // Autocomplete component from Mantine might render the error in a specific way
    await waitFor(() => {
      expect(screen.getByText(/handle not found/i)).toBeInTheDocument();
    });
  });

  it('shows limit reached message when handleCount is at MAX_HANDLES', () => {
    render(<RegisterForm handleCount={15} />);
    expect(screen.getByText(/maximum 15 handles allowed/i)).toBeInTheDocument();
  });

  it('shows suggestions while typing', async () => {
    vi.mocked(publicAgent.get).mockResolvedValue({
      actors: [
        { handle: 'suggestion1.bsky.social', avatar: 'avatar1' },
      ]
    });

    render(<RegisterForm handleCount={1} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('textbox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'sug' } });

    await waitFor(() => {
      expect(screen.getByText('suggestion1.bsky.social')).toBeInTheDocument();
    });
  });
});
