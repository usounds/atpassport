// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { AssociationItem } from '../AssociationItem';

describe('AssociationItem', () => {
  const mockItem = {
    handle: 'user.bsky.social',
    did: 'did:plc:123',
    pdsUrl: 'https://pds.example.com',
    profile: {
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
    fireEvent.click(menuBtn);
    
    // Click Delete in menu
    const deleteMenuBtn = await screen.findByText('Delete');
    fireEvent.click(deleteMenuBtn);
    
    // In modal
    await screen.findByRole('dialog');
    const confirmBtn = screen.getAllByRole('button').find(b => b.textContent === 'Delete');
    if (confirmBtn) {
      fireEvent.click(confirmBtn);
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
    
    fireEvent.click(screen.getByRole('button'));
    
    const moveUpBtn = await screen.findByText('Move Up');
    fireEvent.click(moveUpBtn);
    expect(mockHandlers.onMoveUp).toHaveBeenCalled();

    // Re-open menu for move down
    fireEvent.click(screen.getByRole('button'));
    const moveDownBtn = await screen.findByText('Move Down');
    fireEvent.click(moveDownBtn);
    expect(mockHandlers.onMoveDown).toHaveBeenCalled();
  });

  it('handles refresh', async () => {
    render(<AssociationItem item={mockItem} onRefresh={mockHandlers.onRefresh} />);
    
    fireEvent.click(screen.getByRole('button'));
    const refreshBtn = await screen.findByText('Refresh Metadata');
    fireEvent.click(refreshBtn);
    
    expect(mockHandlers.onRefresh).toHaveBeenCalled();
  });
});
