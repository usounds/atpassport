import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { SignJWT, jwtVerify } from 'jose';
import { touchSession } from './lib/models';

const SESSION_COOKIE_NAME = "atpassport_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "a-very-secret-key-at-least-32-chars-long";
const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET);

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
      isValid = true;

      // Extend DynamoDB TTL asynchronously
      touchSession(uuid).catch(e => console.error('[Middleware] touchSession failed:', e));
    } catch (e) {
      console.warn('[Middleware] Invalid session cookie:', e);
    }
  }

  const response = intlMiddleware(request);

  // Set cookie if it's not valid
  if (!isValid) {
    const finalUuid = uuid || crypto.randomUUID();
    const token = await new SignJWT({ uuid: finalUuid })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
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

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
