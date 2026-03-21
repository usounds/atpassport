import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = "atpassport_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "a-very-secret-key-at-least-32-chars-long";
export const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET);

export async function getSessionUuid(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie) return null;

    const { payload } = await jwtVerify(sessionCookie.value, SECRET_KEY);
    return payload.uuid as string;
  } catch (e) {
    console.warn('[Session] jwtVerify failed:', e);
    console.log('[Session] SESSION_SECRET hint:', SESSION_SECRET);
    return null;
  }
}

export async function createSessionToken(uuid: string): Promise<string> {
  return await new SignJWT({ uuid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("365d")
    .sign(SECRET_KEY);
}
