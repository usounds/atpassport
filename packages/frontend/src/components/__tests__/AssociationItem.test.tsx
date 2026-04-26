// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@/test/utils';
import { AssociationItem } from '../AssociationItem';
import { AssociationWithProfile } from '../../lib/models';

// Mock mantine core components to avoid transition issues
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  return {
    ...actual,
    Transition: ({ children, mounted }: any) => mounted ? children({ transition: {} }) : null,
  };
});

describe('AssociationItem', () => {
  const mockItem: AssociationWithProfile = {
    uuid: 'uuid-1',
    handle: 'user.bsky.social' as any,
    did: 'did:plc:123',
    pdsUrl: 'https://pds.example.com',
    createdAt: '2024-01-01T00:00:00Z',
    profile: {
      did: 'did:plc:123',
      handle: 'user.bsky.social' as any,
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.png'
    }
  };

  const mockHandlers = {
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onDelete: vi.fn(),
    onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<AssociationItem item={mockItem} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('handles delete confirmation', async () => {
    render(<AssociationItem item={mockItem} onDelete={mockHandlers.onDelete} />);
    
    // Open menu
    const menuBtn = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(menuBtn);
    });
    
    // Click Delete in menu
    const deleteMenuBtn = await screen.findByText('Delete');
    await act(async () => {
      fireEvent.click(deleteMenuBtn);
    });
    
    // In modal
    await screen.findByRole('dialog');
    const confirmBtn = screen.getAllByRole('button').find(b => b.textContent === 'Delete');
    if (confirmBtn) {
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
    }
    
    await waitFor(() => {
      expect(mockHandlers.onDelete).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('handles move up and move down', async () => {
    render(
      <AssociationItem 
        item={mockItem} 
        onMoveUp={mockHandlers.onMoveUp} 
        onMoveDown={mockHandlers.onMoveDown} 
      />
    );
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    
    const moveUpBtn = await screen.findByText('Move Up');
    await act(async () => {
      fireEvent.click(moveUpBtn);
    });
    
    await waitFor(() => {
      expect(mockHandlers.onMoveUp).toHaveBeenCalled();
    });

    // Re-open menu for move down
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    const moveDownBtn = await screen.findByText('Move Down');
    await act(async () => {
      fireEvent.click(moveDownBtn);
    });
    
    await waitFor(() => {
      expect(mockHandlers.onMoveDown).toHaveBeenCalled();
    });
  });

  it('handles refresh', async () => {
    render(<AssociationItem item={mockItem} onRefresh={mockHandlers.onRefresh} />);
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });
    const refreshBtn = await screen.findByText('Refresh Metadata');
    await act(async () => {
      fireEvent.click(refreshBtn);
    });
    
    await waitFor(() => {
      expect(mockHandlers.onRefresh).toHaveBeenCalled();
    });
  });
});
