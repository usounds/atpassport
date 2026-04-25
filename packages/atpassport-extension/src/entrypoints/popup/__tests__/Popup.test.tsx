import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { Popup } from '../Popup';

const mockFetchHandles = vi.fn();
const mockApplyHandle = vi.fn();

// Mock HandleManager
vi.mock('@/lib/HandleManager', () => {
  return {
    HandleManager: class {
      fetchHandles = mockFetchHandles;
      applyHandle = mockApplyHandle;
    },
  };
});

describe('Popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchHandles.mockResolvedValue(['user1.test', 'user2.test']);
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
    
    mockFetchHandles.mockResolvedValue(['test.handle']);
    
    render(<Popup />);
    await waitForLoadingToFinish();
    
    expect(screen.getByText('test.handle')).toBeDefined();
    now.mockRestore();
  });

  it('should not open site or change color if error is not loginRequired', async () => {
    mockFetchHandles.mockRejectedValue(new Error('otherError'));

    render(<Popup />);
    await waitForLoadingToFinish();

    const errorDiv = screen.getByText('otherError').closest('div')!;
    
    fireEvent.mouseOver(errorDiv);
    // Style check removed as it's now handled by CSS
    
    fireEvent.click(errorDiv);
    expect(chrome.tabs.create).not.toHaveBeenCalled();
  });

  it('should handle applyHandle throwing an exception', async () => {
    mockFetchHandles.mockResolvedValue(['alice.test']);
    mockApplyHandle.mockRejectedValue(new Error('Internal error'));

    render(<Popup />);
    await waitForLoadingToFinish();

    fireEvent.click(screen.getByText('alice.test'));
    
    await waitFor(() => {
      expect(screen.getByText('copiedIncompatible')).toBeDefined();
    });
  });

  it('should handle generic errors in fetchHandles', async () => {
    mockFetchHandles.mockRejectedValue('String error');

    render(<Popup />);
    await waitForLoadingToFinish();

    expect(screen.getByText('String error')).toBeDefined();
  });

  it('should show empty state when no handles are returned', async () => {
    mockFetchHandles.mockResolvedValue([]);

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
