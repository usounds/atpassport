// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { AssociationListClient } from '../AssociationListClient';
import * as actions from '@/lib/actions';

vi.mock('@/lib/actions', () => ({
  moveAssociation: vi.fn(),
  removeAssociation: vi.fn(),
  refreshAssociation: vi.fn(),
}));

describe('AssociationListClient', () => {
  const mockItems = [
    { did: 'did:1', handle: 'user1.bsky.social', pdsUrl: 'http://pds1' },
    { did: 'did:2', handle: 'user2.bsky.social', pdsUrl: 'http://pds2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a list of items', () => {
    render(<AssociationListClient initialItems={mockItems} />);
    expect(screen.getAllByText(/user1\.bsky\.social/)).toHaveLength(2);
  });

  it('handles item deletion', async () => {
    render(<AssociationListClient initialItems={mockItems} />);
    
    // Open menu for first item
    const menuBtns = screen.getAllByRole('button');
    fireEvent.click(menuBtns[0]);
    
    const deleteBtn = await screen.findByText('Delete');
    fireEvent.click(deleteBtn);
    
    // Find confirm button in modal
    // It's a red button with "Delete" text
    const confirmBtn = await screen.findByRole('button', { name: /^Delete$/ });
    fireEvent.click(confirmBtn);
    
    await waitFor(() => {
      expect(actions.removeAssociation).toHaveBeenCalledWith('did:1');
    });
  });

  it('handles item move up', async () => {
    render(<AssociationListClient initialItems={mockItems} />);
    const menuBtns = screen.getAllByRole('button');
    fireEvent.click(menuBtns[1]);
    const moveUpBtn = await screen.findByText('Move Up');
    fireEvent.click(moveUpBtn);
    
    await waitFor(() => {
      expect(actions.moveAssociation).toHaveBeenCalled();
    });
  });
});
