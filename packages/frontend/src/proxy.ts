import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { jwtVerify } from 'jose';
import { getSecretKey, SESSION_COOKIE_NAME } from './lib/session';

import { createContentSecurityPolicy } from './lib/csp';

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

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isHttps = request.nextUrl.protocol === 'https:';
  const csp = createContentSecurityPolicy(nonce, isDevelopment, isHttps);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const reqWithHeaders = new NextRequest(request, {
    headers: requestHeaders,
  });

  let response = (pathname.startsWith('/api') || pathname.startsWith('/xrpc'))
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : intlMiddleware(reqWithHeaders);

  // Check if the middleware triggered a temporary redirect (307)
  // and convert it to a permanent redirect (308) for better SEO configuration.
  if (response.status === 307 && response.headers.get('location')) {
    const location = response.headers.get('location')!;
    const targetUrl = new URL(location, request.url);

    // Only allow redirects to the same origin to prevent open redirect
    if (targetUrl.origin === request.nextUrl.origin) {
      const redirectResponse = NextResponse.redirect(targetUrl, 308);
      
      // Copy all headers (like Set-Cookie, etc.) from the original response
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== 'location') {
          redirectResponse.headers.set(key, value);
        }
      });
      response = redirectResponse;
    }
  }

  // Ensure responses that might contain user-specific data are NEVER cached by CDNs
  // We apply this to all requests handled by this middleware (non-static)
  const cacheControl = 'private, no-store, max-age=0, must-revalidate';
  response.headers.set('Cache-Control', cacheControl);
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Cloudflare-CDN-Cache-Control', 'no-store');
  response.headers.append('Vary', 'Cookie');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Content-Security-Policy', csp);
  
  // Ensure all response cookies have HttpOnly and (on secure connections) Secure flags
  response.cookies.getAll().forEach((cookie) => {
    response.cookies.set({
      ...cookie,
      httpOnly: true,
      secure: isHttps || process.env.NODE_ENV === 'production' ? true : cookie.secure,
    });
  });

  // Ensure response does not leak server technology via X-Powered-By
  response.headers.delete('x-powered-by');

  // Debug header to confirm middleware execution
  response.headers.set('X-Proxy-Status', 'active');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)']
};
