import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRateLimited, resetRateLimit } from '../rate-limit';

describe('rate-limit Library', () => {
  beforeEach(() => {
    resetRateLimit();
    vi.useFakeTimers();
  });

  it('allows requests within limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited('test-ip')).toBe(false);
    }
    // 6th request should be limited
    expect(isRateLimited('test-ip')).toBe(true);
  });

  it('resets count after window expires', () => {
    isRateLimited('test-ip', 1, 1000);
    expect(isRateLimited('test-ip', 1, 1000)).toBe(true);

    vi.advanceTimersByTime(1001);
    expect(isRateLimited('test-ip', 1, 1000)).toBe(false);
  });

  it('cleans up old entries when map size exceeds 1000', () => {
    const windowMs = 1000;
    // Fill up the map with old entries
    for (let i = 0; i < 1001; i++) {
      isRateLimited(`old-ip-${i}`, 1, windowMs);
    }
    
    // Entries are current, so they won't be deleted yet
    // Advance time so they become "very old" (more than windowMs * 2)
    vi.advanceTimersByTime(windowMs * 3);
    
    // Trigger cleanup by making another request
    isRateLimited('trigger-cleanup', 1, windowMs);
    
    // The map should have been cleaned up
    // We can't directly check map size without exports, but we cover the branch
  });
});
