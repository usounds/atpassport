// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@/test/utils';
import { RegisterForm } from '../RegisterForm';
import * as actions from '@/lib/actions';
import { publicAgent } from '@/lib/atproto';

vi.mock('@/lib/actions');
vi.mock('@/lib/atproto', () => ({
  publicAgent: {
    get: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/i18n/routing', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

// Mock mantine core components to avoid transition issues
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  return {
    ...actual,
    Transition: ({ children, mounted }: any) => mounted ? children({ transition: {} }) : null,
  };
});

// Mock useDebouncedCallback to be instantaneous in tests
vi.mock('@mantine/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/hooks')>();
  return {
    ...actual,
    useDebouncedCallback: (fn: any) => fn,
  };
});

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(publicAgent.get).mockResolvedValue({
      success: true,
      actors: [
        { handle: 'suggestion1.bsky.social', avatar: 'http://avatar1' },
        { handle: 'suggestion2.bsky.social' },
      ],
    } as any);
  });

  it('renders add handle button', () => {
    render(<RegisterForm handleCount={0} />);
    expect(screen.getByText(/add handle/i)).toBeInTheDocument();
  });

  it('opens modal and triggers search when typing', async () => {
    render(<RegisterForm handleCount={0} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } });
    });
    
    await waitFor(() => {
      expect(publicAgent.get).toHaveBeenCalledWith(
        "app.bsky.actor.searchActorsTypeahead",
        expect.objectContaining({ params: expect.objectContaining({ q: 'test' }) })
      );
    });
  });

  it('handles Enter key to register', async () => {
    vi.mocked(actions.registerHandle).mockResolvedValue({ success: true });
    render(<RegisterForm handleCount={1} />);
    
    fireEvent.click(screen.getByText(/add handle/i));
    const input = await screen.findByRole('combobox', { name: /handle/i });
    
    await act(async () => {
      fireEvent.change(input, { target: { value: 'user.test' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });
    
    await waitFor(() => {
      expect(actions.registerHandle).toHaveBeenCalledWith('user.test');
    });
  });

  it('closes modal and resets state', async () => {
    render(<RegisterForm handleCount={1} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'something' } });
    
    // Use container selector or class name to find the close button if aria-label is missing
    const closeBtn = document.querySelector('.mantine-Modal-close');
    if (closeBtn) {
      fireEvent.click(closeBtn);
    }
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Re-open to check if state was reset
    fireEvent.click(screen.getByText(/add handle/i));
    const newInput = await screen.findByRole('combobox', { name: /handle/i });
    expect(newInput).toHaveValue('');
  });

  it('normalizes handles correctly (appends .bsky.social if no dot)', async () => {
    vi.mocked(actions.registerHandle).mockResolvedValue({ success: true });
    render(<RegisterForm handleCount={1} />);
    
    fireEvent.click(screen.getByText(/add handle/i));
    const input = await screen.findByRole('combobox', { name: /handle/i });
    
    fireEvent.change(input, { target: { value: 'user' } });
    
    const registerBtn = screen.getByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    await waitFor(() => {
      expect(actions.registerHandle).toHaveBeenCalledWith('user.bsky.social');
    });
  });

  it('shows checkbox when no handles are registered', async () => {
    render(<RegisterForm handleCount={0} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(screen.getByText(/terms/i)).toBeInTheDocument();
  });

  it('hides checkbox when handles are already registered', async () => {
    render(<RegisterForm handleCount={1} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    await screen.findByRole('combobox', { name: /handle/i });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('calls registerHandle when add button is clicked and agreed', async () => {
    vi.mocked(actions.registerHandle).mockResolvedValue({ success: true });
    
    render(<RegisterForm handleCount={0} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'test.bsky.social' } });
    
    const checkbox = await screen.findByRole('checkbox');
    fireEvent.click(checkbox);
    
    const registerBtn = screen.getByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    await waitFor(() => {
      expect(actions.registerHandle).toHaveBeenCalledWith('test.bsky.social');
    });
  });

  it('does not call registerHandle if consent is required but not given', async () => {
    render(<RegisterForm handleCount={0} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'user.test' } });
    
    // Do NOT click checkbox
    
    const registerBtn = screen.getByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    expect(actions.registerHandle).not.toHaveBeenCalled();
  });

  it('shows limit reached message', async () => {
    render(<RegisterForm handleCount={15} />);
    // When limit reached, the button is not shown, instead an Alert is shown
    expect(screen.getByText(/maximum 15 handles allowed/i)).toBeInTheDocument();
  });

  it('disables add button if not agreed', async () => {
    render(<RegisterForm handleCount={0} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const registerBtn = await screen.findByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    expect(actions.registerHandle).not.toHaveBeenCalled();
  });

  it('handles suggest failure gracefully', async () => {
    vi.mocked(publicAgent.get).mockRejectedValue(new Error('API Error'));
    
    render(<RegisterForm handleCount={1} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'err' } });

    await waitFor(() => {
      expect(screen.queryByText('suggestion1.bsky.social')).not.toBeInTheDocument();
    });
  });

  it('shows error if registration throws an unexpected error', async () => {
    vi.mocked(actions.registerHandle).mockRejectedValue(new Error('Fatal Error'));
    
    render(<RegisterForm handleCount={1} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'fatal.error' } });
    
    const registerBtn = screen.getByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/fatal error/i)).toBeInTheDocument();
    });
  });

  it('shows error message when handle is already registered', async () => {
    vi.mocked(actions.registerHandle).mockResolvedValue({ 
      success: false, 
      error: "already_registered" 
    });
    
    render(<RegisterForm handleCount={1} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'existing' } });
    
    const registerBtn = screen.getByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/this handle is already registered/i)).toBeInTheDocument();
    });
  });

  it('shows generic error message when registration fails', async () => {
    vi.mocked(actions.registerHandle).mockResolvedValue({ 
      success: false, 
      error: "generic_failure" 
    });
    
    render(<RegisterForm handleCount={1} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'error' } });
    
    const registerBtn = screen.getByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/generic_failure/i)).toBeInTheDocument();
    });
  });

  it('clears suggestions when input is empty', async () => {
    render(<RegisterForm handleCount={1} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    
    fireEvent.change(input, { target: { value: 'sug' } });
    fireEvent.change(input, { target: { value: '' } });
    
    await waitFor(() => {
      expect(screen.queryByText('suggestion1.bsky.social')).not.toBeInTheDocument();
    });
  });

  it('does nothing if normalized handle is empty', async () => {
    render(<RegisterForm handleCount={1} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    fireEvent.change(input, { target: { value: '   ' } });
    
    const registerBtn = screen.getByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    expect(actions.registerHandle).not.toHaveBeenCalled();
  });

  it('updates agreed state when checkbox is clicked', async () => {
    render(<RegisterForm handleCount={0} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const checkbox = await screen.findByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('clears error when input changes', async () => {
    vi.mocked(actions.registerHandle).mockResolvedValue({ success: false, error: 'fail' });
    render(<RegisterForm handleCount={1} />);
    fireEvent.click(screen.getByText(/add handle/i));
    
    const input = await screen.findByRole('combobox', { name: /handle/i });
    fireEvent.change(input, { target: { value: 'err' } });
    const registerBtn = screen.getByText(/^add$/i);
    fireEvent.click(registerBtn);
    
    await waitFor(() => {
      expect(screen.getByText('fail')).toBeInTheDocument();
    });
    
    fireEvent.change(input, { target: { value: 'new' } });
    expect(screen.queryByText('fail')).not.toBeInTheDocument();
  });
});
