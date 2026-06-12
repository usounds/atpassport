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

  let response = (pathname.startsWith('/api') || pathname.startsWith('/xrpc'))
    ? NextResponse.next()
    : intlMiddleware(request);

  // Check if the middleware triggered a temporary redirect (307)
  // and convert it to a permanent redirect (308) for better SEO configuration.
  if (response.status === 307 && response.headers.get('location')) {
    const location = response.headers.get('location')!;
    const redirectResponse = NextResponse.redirect(new URL(location, request.url), 308);
    
    // Copy all headers (like Set-Cookie, etc.) from the original response
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'location') {
        redirectResponse.headers.set(key, value);
      }
    });
    response = redirectResponse;
  }

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
