// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { AuthAccountList } from '../AuthAccountList';
import { type AssociationWithProfile } from '@/lib/models';
import * as actions from '@/lib/actions';

// Mock routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
  usePathname: () => '/',
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
}));

// Mock nextjs-toploader
vi.mock('nextjs-toploader', () => ({
  useTopLoader: () => ({
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

// Mock next-intl (partial mock for Auth messages)
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  return {
    ...actual,
    useTranslations: (namespace?: string) => {
      if (namespace === 'Auth') {
        return (key: string, values?: Record<string, string | number>) => {
          const messages: Record<string, string> = {
            'title': 'Authentication',
            'moving_to': 'Moving to {domain}',
            'authenticating_message': 'Authenticating {domain} via {pds}',
            'no_accounts': 'No accounts found',
            'manage_account': 'Manage Account',
            'move_up': 'Move Up',
            'move_down': 'Move Down',
            'refresh_metadata': 'Refresh Metadata',
            'delete': 'Delete',
            'confirm_delete_title': 'Confirm Delete',
            'confirm_delete_text': 'Are you sure?',
            'cancel': 'Cancel',
            'unverified_domain_title': 'Unverified Domain',
            'unverified_domain_message': 'Domain {domain} is not verified',
          };
          let msg = messages[key] || key;
          if (values) {
            Object.keys(values).forEach(k => {
              msg = msg.replace(`{${k}}`, String(values[k]));
            });
          }
          return msg;
        };
      }
      return actual.useTranslations(namespace);
    },
  };
});

// Mock lib/actions
vi.mock('@/lib/actions', () => ({
  refreshAssociation: vi.fn(),
  removeAssociation: vi.fn(),
  moveAssociation: vi.fn(),
}));

describe('AuthAccountList', () => {
  const mockItems: AssociationWithProfile[] = [
    {
      did: 'did:plc:1',
      handle: 'user1.test',
      pdsUrl: 'https://pds1.com',
      profile: { displayName: 'User One' },
      verifiedAt: '2023-01-01',
    },
    {
      did: 'did:plc:2',
      handle: 'user2.test',
      pdsUrl: 'https://pds2.com',
      profile: { displayName: 'User Two' },
      verifiedAt: '2023-01-02',
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.replace
    vi.stubGlobal('location', {
      replace: vi.fn(),
      origin: 'https://atpassport.net',
      pathname: '/auth',
      href: 'https://atpassport.net/auth',
    });
  });

  it('renders a list of accounts', () => {
    render(<AuthAccountList initialItems={mockItems} domain="example.com" callback="https://callback.com" />);
    
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('@user1.test')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
    expect(screen.getByText('@user2.test')).toBeInTheDocument();
  });

  it('shows unverified alert when isVerified is false', () => {
    render(<AuthAccountList initialItems={mockItems} domain="example.com" callback="https://callback.com" isVerified={false} />);
    expect(screen.getByText('Unverified Domain')).toBeInTheDocument();
  });

  it('shows no accounts message when list is empty', () => {
    render(<AuthAccountList initialItems={[]} domain="example.com" callback="https://callback.com" />);
    expect(screen.getByText('No accounts found')).toBeInTheDocument();
  });

  it('handles item selection and shows authenticating state', async () => {
    render(<AuthAccountList initialItems={mockItems} domain="example.com" callback="https://callback.com?existing=1" />);
    
    const item = screen.getByText('User One');
    fireEvent.click(item);

    // Should show authenticating message
    expect(screen.getByText('Authenticating example.com via pds1.com')).toBeInTheDocument();
    
    // Should have called window.location.replace with combined search params
    expect(window.location.replace).toHaveBeenCalledWith(expect.stringContaining('existing=1'));
    expect(window.location.replace).toHaveBeenCalledWith(expect.stringContaining('handle=user1.test'));
  });

  it('shows different messages based on domain match', () => {
    const { rerender } = render(<AuthAccountList initialItems={mockItems} domain="different.com" callback="http://cb" isVerified={true} />);
    // When isVerified is true but items don't match, it should show RegisterForm
    expect(screen.getByText('Authentication')).toBeInTheDocument();

    rerender(<AuthAccountList initialItems={mockItems} domain="user1.test" callback="http://cb" isVerified={false} />);
    expect(screen.getByText('Unverified Domain')).toBeInTheDocument();
  });

  it('filters items correctly based on domain', () => {
    render(<AuthAccountList initialItems={mockItems} domain="user1.test" callback="http://cb" />);
    // Both items should still be visible as options
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
  });

  it('calls removeAssociation when deleting an item', async () => {
    render(<AuthAccountList initialItems={mockItems} domain="example.com" callback="https://callback.com" />);
    
    // Open menu for the first item
    const menuButtons = screen.getAllByRole('button');
    // The first menu button is at index 0 (assuming no other buttons before it)
    fireEvent.click(menuButtons[0]);

    // Click delete in menu (it might be in a portal, so use findByText)
    const deleteButton = await screen.findByText('Delete');
    fireEvent.click(deleteButton);

    // Confirm modal should appear
    expect(await screen.findByText('Confirm Delete')).toBeInTheDocument();
    
    // Click confirm delete
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(actions.removeAssociation).toHaveBeenCalledWith('did:plc:1');
    });
  });

  it('cancels deletion when cancel button is clicked', async () => {
    render(<AuthAccountList initialItems={mockItems} domain="example.com" callback="https://callback.com" />);
    
    const menuButtons = screen.getAllByRole('button');
    fireEvent.click(menuButtons[0]);

    const deleteButton = await screen.findByText('Delete');
    fireEvent.click(deleteButton);

    const cancelButtons = await screen.findAllByText('Cancel');
    fireEvent.click(cancelButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });
    expect(actions.removeAssociation).not.toHaveBeenCalled();
  });
});
