import { cookies } from "next/headers";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";

export const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' 
  ? "__Host-atpassport_session_v2" 
  : "atpassport_session_v2";
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET environment variable is not set.");
  } else {
    console.warn("⚠️ SESSION_SECRET is not set. Using an insecure default key for development.");
  }
} else if (SESSION_SECRET.length < 32) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be at least 32 characters long for security.");
  } else {
    console.warn("⚠️ SESSION_SECRET is too short. It should be at least 32 characters.");
  }
}

export const SECRET_KEY = new TextEncoder().encode(
  SESSION_SECRET || "dev-only-insecure-secret-key-at-least-32-chars-long"
);

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
  const payload: JWTPayload = { uuid, lastTouched: now };
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime("365d")
    .sign(SECRET_KEY);
}

/**
 * セッションの有効期限を延長します。
 * この関数は Server Actions (POSTリクエスト) 内からのみ呼び出されるべきです。
 */
export async function refreshSession() {
  const uuid = await getSessionUuid();
  if (!uuid) return;

  const sessionToken = await createSessionToken(uuid);
  const cookieStore = await cookies();

  // Next.js 16 では Server Actions 内であれば cookieStore.set が提供されています。
  // 万が一型推論が Readonly になっている場合は、適切なキャスト（ResponseCookies）を検討します。
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
