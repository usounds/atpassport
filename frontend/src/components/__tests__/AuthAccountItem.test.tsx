// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { AuthAccountItem } from '../AuthAccountItem';

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

describe('AuthAccountItem', () => {
  const mockItem = {
    did: 'did:plc:1',
    handle: 'user.test',
    pdsUrl: 'http://pds',
    profile: { displayName: 'User Name', avatar: 'http://avatar' },
    verifiedAt: '2023-01-01',
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

  it('calls onSelect and redirects when clicked', () => {
    const onSelect = vi.fn();
    render(<AuthAccountItem item={mockItem} index={0} isFirst={true} isLast={false} onSelect={onSelect} callback="http://cb" />);
    fireEvent.click(screen.getByText('User Name'));
    expect(onSelect).toHaveBeenCalledWith(mockItem);
    expect(window.location.replace).toHaveBeenCalled();
  });

  it('triggers refresh metadata action', async () => {
    const onRefresh = vi.fn();
    render(<AuthAccountItem item={mockItem} index={0} isFirst={true} isLast={false} onSelect={vi.fn()} onRefresh={onRefresh} callback="http://cb" />);
    
    const menuBtn = screen.getByRole('button');
    fireEvent.click(menuBtn);

    const refreshBtn = await screen.findByText('refresh_metadata');
    fireEvent.click(refreshBtn);

    expect(onRefresh).toHaveBeenCalled();
  });

  it('triggers move actions', async () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    render(<AuthAccountItem item={mockItem} index={1} isFirst={false} isLast={false} onSelect={vi.fn()} onMoveUp={onMoveUp} onMoveDown={onMoveDown} callback="http://cb" />);
    
    const menuBtn = screen.getByRole('button');
    fireEvent.click(menuBtn);

    const upBtn = await screen.findByText('move_up');
    fireEvent.click(upBtn);
    expect(onMoveUp).toHaveBeenCalled();

    fireEvent.click(menuBtn);
    const downBtn = await screen.findByText('move_down');
    fireEvent.click(downBtn);
    expect(onMoveDown).toHaveBeenCalled();
  });

  it('shows and confirms deletion', async () => {
    const onDelete = vi.fn();
    render(<AuthAccountItem item={mockItem} index={0} isFirst={true} isLast={false} onSelect={vi.fn()} onDelete={onDelete} callback="http://cb" />);
    
    const menuBtn = screen.getByRole('button');
    fireEvent.click(menuBtn);

    const deleteBtn = await screen.findByText('delete');
    fireEvent.click(deleteBtn);

    expect(await screen.findByText('confirm_delete_title')).toBeInTheDocument();
    
    const confirmBtns = screen.getAllByRole('button');
    const confirmBtn = confirmBtns.find(b => b.textContent === 'delete');
    if (confirmBtn) fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
    });
  });
});
