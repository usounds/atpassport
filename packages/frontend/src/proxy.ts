import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { SignJWT, jwtVerify } from 'jose';
import { touchSession } from './lib/models';
import { SESSION_COOKIE_NAME, SECRET_KEY } from './lib/session';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.includes('webpack-hmr') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  let uuid: string | null = null;
  let isValid = false;

  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie.value, SECRET_KEY);
      uuid = payload.uuid as string;
      
      const now = Math.floor(Date.now() / 1000);
      const lastTouched = (payload.lastTouched as number) || (payload.iat as number) || 0;

      // Only update DynamoDB if more than 24 hours have passed since last touch
      if (now - lastTouched > 24 * 60 * 60) {
        console.log(`[Middleware] Touching session for ${uuid} (last touched: ${new Date(lastTouched * 1000).toISOString()})`);
        await touchSession(uuid);
        isValid = false; // Trigger cookie refresh to update lastTouched
      } else {
        isValid = true;
      }
    } catch (e) {
      console.warn('[Middleware] Invalid session cookie:', e);
    }
  }

  const response = (pathname.startsWith('/api') || pathname.startsWith('/xrpc'))
    ? NextResponse.next()
    : intlMiddleware(request);

  // Set cookie only if it's not valid AND we have an existing uuid
  if (!isValid && uuid) {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ uuid, lastTouched: now })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime('365d')
      .sign(SECRET_KEY);

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
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
