import { describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('next-intl/middleware', () => ({
  default: () => (request: NextRequest) => {
    const response = request.nextUrl.pathname === '/'
      ? NextResponse.redirect(new URL('/en', request.url), 307)
      : NextResponse.next();
    response.cookies.set('NEXT_LOCALE', 'en', { sameSite: 'lax' });
    return response;
  },
}));

vi.mock('../i18n/routing', () => ({ routing: {} }));

vi.mock('../lib/session', () => ({
  SESSION_COOKIE_NAME: 'session',
  getSecretKey: vi.fn(),
}));

import middleware from '../proxy';

describe('locale response cookie security', () => {
  it.each([
    ['/', 308],
    ['/ja', 200],
  ])('preserves HttpOnly on %s responses', async (pathname, status) => {
    const response = await middleware(new NextRequest(`https://atpassport.net${pathname}`));

    expect(response.status).toBe(status);
    const cookie = response.headers.get('set-cookie');
    expect(cookie).toContain('NEXT_LOCALE=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=lax');
    expect(response.headers.get('x-middleware-set-cookie')).toContain('HttpOnly');
    if (status === 308) {
      expect(response.headers.get('location')).toBe('https://atpassport.net/en');
    }
  });
});
