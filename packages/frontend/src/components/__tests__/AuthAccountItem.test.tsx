// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '../../test/utils';
import { AuthAccountItem } from '../AuthAccountItem';
import { AssociationWithProfile } from '../../lib/models';

vi.mock('nextjs-toploader', () => ({
  useTopLoader: () => ({
    start: vi.fn(),
    stop: vi.fn(),
  }),
}));

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>();
  return {
    ...actual,
    useTranslations: () => (key: string) => key,
  };
});

// Mock Mantine components that use transitions/timers to be instantaneous
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  return {
    ...actual,
    Transition: ({ children, mounted }: any) => mounted ? children({ transition: {} }) : null,
    // We don't mock everything, just what's problematic.
    // If Menu still causes issues, we can mock more.
  };
});

describe('AuthAccountItem', () => {
  const mockItem: AssociationWithProfile = {
    uuid: 'uuid-1',
    did: 'did:plc:1',
    handle: 'user.test' as any,
    pdsUrl: 'http://pds',
    profile: { did: 'did:plc:1', handle: 'user.test' as any, displayName: 'User Name', avatar: 'http://avatar' },
    createdAt: '2023-01-01',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('location', { replace: vi.fn() });
  });

  it('renders account information correctly', () => {
    render(<AuthAccountItem item={mockItem} index={0} isFirst={true} isLast={false} onSelect={vi.fn()} callback="http://cb" />);
    expect(screen.getByText('User Name')).toBeInTheDocument();
    expect(screen.getByText('@user.test')).toBeInTheDocument();
  });

  it('calls onSelect and redirects when clicked', async () => {
    const onSelect = vi.fn();
    render(<AuthAccountItem item={mockItem} index={0} isFirst={true} isLast={false} onSelect={onSelect} callback="http://cb" />);
    await act(async () => {
      fireEvent.click(screen.getByText('User Name'));
    });
    expect(onSelect).toHaveBeenCalledWith(mockItem);
    expect(window.location.replace).toHaveBeenCalled();
  });

  it('triggers refresh metadata action', async () => {
    const onRefresh = vi.fn();
    render(<AuthAccountItem item={mockItem} index={0} isFirst={true} isLast={false} onSelect={vi.fn()} onRefresh={onRefresh} callback="http://cb" />);
    
    const menuBtn = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    const refreshBtn = await screen.findByText('refresh_metadata');
    await act(async () => {
      fireEvent.click(refreshBtn);
    });

    expect(onRefresh).toHaveBeenCalled();
  });

  it('triggers move actions', async () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    render(<AuthAccountItem item={mockItem} index={1} isFirst={false} isLast={false} onSelect={vi.fn()} onMoveUp={onMoveUp} onMoveDown={onMoveDown} callback="http://cb" />);
    
    const menuBtn = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    const upBtn = await screen.findByText('move_up');
    await act(async () => {
      fireEvent.click(upBtn);
    });
    expect(onMoveUp).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(menuBtn);
    });
    const downBtn = await screen.findByText('move_down');
    await act(async () => {
      fireEvent.click(downBtn);
    });
    expect(onMoveDown).toHaveBeenCalled();
  });

  it('shows and confirms deletion', async () => {
    const onDelete = vi.fn();
    render(<AuthAccountItem item={mockItem} index={0} isFirst={true} isLast={false} onSelect={vi.fn()} onDelete={onDelete} callback="http://cb" />);
    
    const menuBtn = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(menuBtn);
    });

    const deleteBtn = await screen.findByText('delete');
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(await screen.findByText('confirm_delete_title')).toBeInTheDocument();
    
    const confirmBtns = screen.getAllByRole('button');
    const confirmBtn = confirmBtns.find(b => b.textContent === 'delete');
    if (confirmBtn) {
      await act(async () => {
        fireEvent.click(confirmBtn);
      });
    }

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
    });
  });
});
