import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isRateLimited } from '../rate-limit';

describe('Rate Limit Library', () => {
  const mockIp = '127.0.0.1';

  beforeEach(() => {
    vi.useFakeTimers();
    // rateLimitMap is internal and not exported, so we rely on tests to clear it via window timeout
  });

  it('should allow initial requests within limit', () => {
    expect(isRateLimited(mockIp, 2, 60000)).toBe(false);
    expect(isRateLimited(mockIp, 2, 60000)).toBe(false);
  });

  it('should rate limit if requests exceed limit', () => {
    isRateLimited(mockIp, 2, 60000); // 1
    isRateLimited(mockIp, 2, 60000); // 2
    expect(isRateLimited(mockIp, 2, 60000)).toBe(true); // 3
  });

  it('should reset after time window has passed', () => {
    isRateLimited(mockIp, 1, 60000);
    expect(isRateLimited(mockIp, 1, 60000)).toBe(true);

    // Advance time by 61 seconds
    vi.advanceTimersByTime(61000);

    expect(isRateLimited(mockIp, 1, 60000)).toBe(false);
  });
});
