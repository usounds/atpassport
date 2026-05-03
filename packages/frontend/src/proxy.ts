import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { jwtVerify } from 'jose';
import { getSecretKey, SESSION_COOKIE_NAME } from './lib/session';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and internal paths are skipped
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('webpack-hmr') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (sessionCookie) {
    const secretKey = getSecretKey();

    try {
      // Just verify the session, do not update it here to avoid Cache-Control/Set-Cookie issues on GET
      await jwtVerify(sessionCookie.value, secretKey);
    } catch (e) {
      console.warn('[Middleware] Invalid session cookie:', e);
    }
  }

  const response = (pathname.startsWith('/api') || pathname.startsWith('/xrpc'))
    ? NextResponse.next()
    : intlMiddleware(request);

  // Ensure responses that might contain user-specific data are NEVER cached by CDNs
  // We apply this to all requests handled by this middleware (non-static)
  const cacheControl = 'private, no-store, max-age=0, must-revalidate';
  response.headers.set('Cache-Control', cacheControl);
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  response.headers.append('Vary', 'Cookie');
  
  // Debug header to confirm middleware execution
  response.headers.set('X-Proxy-Status', 'active');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']
};
