// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@/test/utils';
import { AssociationListClient } from '../AssociationListClient';
import * as actions from '@/lib/actions';

vi.mock('@/lib/actions', () => ({
  moveAssociation: vi.fn(),
  removeAssociation: vi.fn(),
  refreshAssociation: vi.fn(),
}));

// Mock mantine core components to avoid transition issues
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  return {
    ...actual,
    Transition: ({ children, mounted }: any) => mounted ? children({ transition: {} }) : null,
  };
});

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
    await act(async () => {
      fireEvent.click(menuBtns[0]);
    });
    
    const deleteBtn = await screen.findByText('Delete');
    await act(async () => {
      fireEvent.click(deleteBtn);
    });
    
    // Find confirm button in modal
    // It's a red button with "Delete" text
    const confirmBtn = await screen.findByRole('button', { name: /^Delete$/ });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });
    
    await waitFor(() => {
      expect(actions.removeAssociation).toHaveBeenCalledWith('did:1');
    });
  });

  it('handles item move up', async () => {
    render(<AssociationListClient initialItems={mockItems} />);
    const menuBtns = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(menuBtns[1]);
    });
    const moveUpBtn = await screen.findByText('Move Up');
    await act(async () => {
      fireEvent.click(moveUpBtn);
    });
    
    await waitFor(() => {
      expect(actions.moveAssociation).toHaveBeenCalled();
    });
  });

  it('handles item move down', async () => {
    render(<AssociationListClient initialItems={mockItems} />);
    const menuBtns = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(menuBtns[0]);
    });
    const moveDownBtn = await screen.findByText('Move Down');
    await act(async () => {
      fireEvent.click(moveDownBtn);
    });
    
    await waitFor(() => {
      expect(actions.moveAssociation).toHaveBeenCalled();
    });
  });

  it('handles item refresh', async () => {
    render(<AssociationListClient initialItems={mockItems} />);
    const menuBtns = screen.getAllByRole('button');
    await act(async () => {
      fireEvent.click(menuBtns[0]);
    });
    const refreshBtn = await screen.findByText('Refresh Metadata');
    await act(async () => {
      fireEvent.click(refreshBtn);
    });
    
    await waitFor(() => {
      expect(actions.refreshAssociation).toHaveBeenCalledWith('did:1');
    });
  });
});
