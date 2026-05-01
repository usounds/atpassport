import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' 
  ? "__Host-atpassport_session_v2" 
  : "atpassport_session_v2";
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET environment variable is not set. Please set it in your environment variables.");
}

export const SECRET_KEY = new TextEncoder().encode(SESSION_SECRET || "dev-only-insecure-secret-key-at-least-32-chars-long");

export async function getSessionUuid(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie) return null;

    const { payload } = await jwtVerify(sessionCookie.value, SECRET_KEY);
    return payload.uuid as string;
  } catch (e) {
    console.warn('[Session] jwtVerify failed:', e);
    return null;
  }
}

export async function createSessionToken(uuid: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ uuid, lastTouched: now })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime("365d")
    .sign(SECRET_KEY);
}
