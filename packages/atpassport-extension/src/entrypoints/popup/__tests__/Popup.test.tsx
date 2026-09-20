import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Popup } from '../Popup';

const mockFetchAccounts = vi.fn();
const mockApplyHandle = vi.fn();

// Mock HandleManager
vi.mock('@/lib/HandleManager', () => {
  return {
    HandleManager: class {
      fetchAccounts = mockFetchAccounts;
      fetchHandles = mockFetchAccounts;
      applyHandle = mockApplyHandle;
    },
  };
});

describe('Popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchAccounts.mockResolvedValue([
      { handle: 'user1.test' },
      { handle: 'user2.test' }
    ]);
    mockApplyHandle.mockResolvedValue('filledSuccess');
    
    vi.stubGlobal('fetch', vi.fn());
  });

  const waitForLoadingToFinish = async () => {
    await waitFor(() => {
      expect(screen.queryByText('processing')).toBeNull();
    }, { timeout: 3000 });
  };

  it('should skip smoothing timeout if fetch is slow', async () => {
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValueOnce(0);
    now.mockReturnValueOnce(600);
    
    mockFetchAccounts.mockResolvedValue([{ handle: 'test.handle' }]);
    
    render(<Popup />);
    await waitForLoadingToFinish();
    
    expect(screen.getByText('@test.handle')).toBeDefined();
    now.mockRestore();
  });

  it('should render display name and avatar if provided', async () => {
    mockFetchAccounts.mockResolvedValue([
      {
        handle: 'charlie.test',
        displayName: 'Charlie Brown',
        avatar: 'https://example.com/charlie.png',
      },
    ]);

    render(<Popup />);
    await waitForLoadingToFinish();

    expect(screen.getByText('Charlie Brown')).toBeDefined();
    expect(screen.getByText('@charlie.test')).toBeDefined();
  });

  it('should not open site or change color if error is not loginRequired and allow retry', async () => {
    mockFetchAccounts.mockRejectedValueOnce(new Error('networkError'));

    render(<Popup />);
    await waitForLoadingToFinish();

    const errorBox = screen.getByText('networkError').closest('.error-box')!;
    fireEvent.click(errorBox);
    expect(chrome.tabs.create).not.toHaveBeenCalled();

    // Clicking retry button should refetch
    mockFetchAccounts.mockResolvedValueOnce([{ handle: 'retried.user' }]);
    const retryBtn = screen.getByText('retry');
    fireEvent.click(retryBtn);

    await waitForLoadingToFinish();
    expect(screen.getByText('@retried.user')).toBeDefined();
  });

  it('should open site when clicking loginRequired error', async () => {
    mockFetchAccounts.mockRejectedValue(new Error('loginRequired'));

    render(<Popup />);
    await waitForLoadingToFinish();

    const errorBox = screen.getByText('loginRequired').closest('.error-box')!;
    expect(screen.queryByText('retry')).toBeNull();

    fireEvent.click(errorBox);
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://atpassport.net' });
  });

  it('should handle applyHandle throwing an exception', async () => {
    mockFetchAccounts.mockResolvedValue([{ handle: 'alice.test' }]);
    mockApplyHandle.mockRejectedValue(new Error('Internal error'));

    render(<Popup />);
    await waitForLoadingToFinish();

    fireEvent.click(screen.getByText('@alice.test'));
    
    await waitFor(() => {
      expect(screen.getByText('copiedIncompatible')).toBeDefined();
    });
  });

  it('should handle generic errors in fetchHandles', async () => {
    mockFetchAccounts.mockRejectedValue('String error');

    render(<Popup />);
    await waitForLoadingToFinish();

    expect(screen.getByText('String error')).toBeDefined();
  });

  it('should show empty state when no handles are returned', async () => {
    mockFetchAccounts.mockResolvedValue([]);

    render(<Popup />);
    await waitForLoadingToFinish();

    expect(screen.getByText('noHandles')).toBeDefined();
  });

  it('should cover logo click and hover', async () => {
    render(<Popup />);
    await waitForLoadingToFinish();

    const logoDiv = screen.getByTitle('Go to atpassport.net');
    fireEvent.mouseOver(logoDiv);
    fireEvent.mouseOut(logoDiv);
    
    fireEvent.click(logoDiv);
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://atpassport.net' });
  });

  it('should cover footer note click', async () => {
    render(<Popup />);
    await waitForLoadingToFinish();

    fireEvent.click(screen.getByText('footerNote'));
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://atpassport.net' });
  });
});
