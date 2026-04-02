import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HandleManager } from '../HandleManager';

describe('HandleManager', () => {
  let manager: HandleManager;

  beforeEach(() => {
    manager = new HandleManager();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('fetchHandles', () => {
    it('should return handles on successful fetch', async () => {
      const mockHandles = ['user1.test', 'user2.test'];
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ handles: mockHandles }),
      } as Response);

      const result = await manager.fetchHandles();
      expect(result).toEqual(mockHandles);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/user/handles'), expect.anything());
    });

    it('should throw loginRequired on 401 status', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
      } as Response);

      await expect(manager.fetchHandles()).rejects.toThrow('loginRequired');
    });

    it('should throw fetchError on network failure', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Failed to fetch'));

      await expect(manager.fetchHandles()).rejects.toThrow('fetchError');
    });
  });

  describe('applyHandle', () => {
    it('should return filledSuccess when scripting succeeds', async () => {
      vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 1 }] as unknown as chrome.tabs.Tab[]);
      vi.mocked(chrome.scripting.executeScript).mockResolvedValue([{ result: { success: true } }] as unknown as chrome.scripting.InjectionResult<unknown>[]);

      const result = await manager.applyHandle('test.handle');
      expect(result).toBe('filledSuccess');
    });

    it('should return copiedFallback and use clipboard when scripting finds no input', async () => {
      vi.mocked(chrome.tabs.query).mockResolvedValue([{ id: 1 }] as unknown as chrome.tabs.Tab[]);
      vi.mocked(chrome.scripting.executeScript).mockResolvedValue([{ result: { success: false } }] as unknown as chrome.scripting.InjectionResult<unknown>[]);

      const result = await manager.applyHandle('test.handle');
      expect(result).toBe('copiedFallback');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test.handle');
    });

    it('should return copiedIncompatible when error occurs', async () => {
      vi.mocked(chrome.tabs.query).mockRejectedValue(new Error('Tab error'));

      const result = await manager.applyHandle('test.handle');
      expect(result).toBe('copiedIncompatible');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test.handle');
    });
  });
});
