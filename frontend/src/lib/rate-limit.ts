const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();

/**
 * Simple in-memory rate limiter based on IP address.
 * note: In a serverless environment like AWS Lambda, this cache is per-instance.
 * @param ip The IP address to check
 * @param limit Max requests allowed in the window
 * @param windowMs Time window in milliseconds (e.g., 60000 for 1 minute)
 * @returns true if allowed, false if limit exceeded
 */
export function isRateLimited(ip: string, limit: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userData = rateLimitMap.get(ip);

  // Cleanup old entries periodically (every 100 entries)
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now - value.lastRequest > windowMs * 2) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!userData || now - userData.lastRequest > windowMs) {
    // Reset or new entry
    rateLimitMap.set(ip, { count: 1, lastRequest: now });
    return false;
  }

  if (userData.count >= limit) {
    return true;
  }

  userData.count += 1;
  userData.lastRequest = now;
  return false;
}
