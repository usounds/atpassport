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

    it('should throw original error if not fetch failure', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Some other error'));
      await expect(manager.fetchHandles()).rejects.toThrow('Some other error');
    });

    it('should throw string error if thrown from fetch', async () => {
      vi.mocked(fetch).mockRejectedValue('Generic error');
      await expect(manager.fetchHandles()).rejects.toBe('Generic error');
    });

    it('should throw fetchError_xxx on other status codes', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      await expect(manager.fetchHandles()).rejects.toThrow('fetchError_500');
    });
  });

  describe('applyHandle', () => {
    it('should return filledSuccess when scripting succeeds', async () => {
      vi.mocked(chrome.tabs.query as any).mockResolvedValue([{ id: 1 }] as unknown as chrome.tabs.Tab[]);
      vi.mocked(chrome.scripting.executeScript as any).mockResolvedValue([{ result: { success: true } }] as unknown as chrome.scripting.InjectionResult<unknown>[]);

      const result = await manager.applyHandle('test.handle');
      expect(result).toBe('filledSuccess');
    });

    it('should return copiedFallback when scripting results are undefined', async () => {
      vi.mocked(chrome.tabs.query as any).mockResolvedValue([{ id: 1 }] as unknown as chrome.tabs.Tab[]);
      vi.mocked(chrome.scripting.executeScript as any).mockResolvedValue(undefined as any);

      const result = await manager.applyHandle('test.handle');
      expect(result).toBe('copiedFallback');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test.handle');
    });

    it('should return copiedFallback and use clipboard when scripting finds no input', async () => {
      vi.mocked(chrome.tabs.query as any).mockResolvedValue([{ id: 1 }] as unknown as chrome.tabs.Tab[]);
      vi.mocked(chrome.scripting.executeScript as any).mockResolvedValue([{ result: { success: false } }] as unknown as chrome.scripting.InjectionResult<unknown>[]);

      const result = await manager.applyHandle('test.handle');
      expect(result).toBe('copiedFallback');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test.handle');
    });

    it('should return copiedIncompatible when chrome.tabs.query throws', async () => {
      vi.mocked(chrome.tabs.query).mockRejectedValue(new Error('Tab error'));

      const result = await manager.applyHandle('test.handle');
      expect(result).toBe('copiedIncompatible');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test.handle');
    });

    it('should cover the script function logic', async () => {
      // This is a hack to cover the function passed to executeScript.
      // We extract the function and call it manually in our jsdom environment.
      
      const spy = vi.spyOn(chrome.scripting, 'executeScript');
      vi.mocked(chrome.tabs.query as any).mockResolvedValue([{ id: 1 }] as any);
      vi.mocked(chrome.scripting.executeScript as any).mockResolvedValue([{ result: { success: true } }] as any);

      await manager.applyHandle('test.handle');
      
      const callArgs = spy.mock.calls[0][0] as any;
      const scriptFunc = callArgs.func;
      
      // Setup DOM for scriptFunc
      document.body.innerHTML = '<input id="handle" />';
      const input = document.getElementById('handle') as HTMLInputElement;
      
      // Mock window.HTMLInputElement.prototype.value setter
      const setter = vi.fn();
      Object.defineProperty(window.HTMLInputElement.prototype, 'value', {
        set: setter,
        configurable: true
      });

      const res = scriptFunc('test.handle');
      expect(res.success).toBe(true);

      // Test activeElement branch
      input.focus();
      const res2 = scriptFunc('test.handle');
      expect(res2.success).toBe(true);

      // Test no input found branch
      document.body.innerHTML = '';
      const res3 = scriptFunc('test.handle');
      expect(res3.success).toBe(false);
    });
  });
});
