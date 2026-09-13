import { cookies } from "next/headers";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";

export const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production' 
  ? "__Host-atpassport_session_v2" 
  : "atpassport_session_v2";
export const FEDCM_SESSION_COOKIE_NAME = "__Secure-atpassport_fedcm_v1";
export const FEDCM_SESSION_COOKIE_PATH = "/api/fedcm";
const SESSION_MAX_AGE = 60 * 60 * 24 * 365;
const FEDCM_SESSION_PURPOSE = "fedcm";
const DEVELOPMENT_SECRET =
  "dev-only-insecure-secret-key-at-least-32-chars-long";
let hasWarnedAboutDevelopmentSecret = false;

function warnAboutDevelopmentSecret(message: string) {
  if (!hasWarnedAboutDevelopmentSecret) {
    console.warn(message);
    hasWarnedAboutDevelopmentSecret = true;
  }
}

export function getSecretKey() {
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is not set.");
    }

    warnAboutDevelopmentSecret(
      "SESSION_SECRET is not set. Using an insecure default key for development."
    );
    return new TextEncoder().encode(DEVELOPMENT_SECRET);
  }

  if (sessionSecret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET must be at least 32 characters long for security."
      );
    }

    warnAboutDevelopmentSecret(
      "SESSION_SECRET is too short. Using an insecure default key for development."
    );
    return new TextEncoder().encode(DEVELOPMENT_SECRET);
  }

  return new TextEncoder().encode(sessionSecret);
}

export async function getSessionUuid(): Promise<string | null> {
  const secretKey = getSecretKey();

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie) return null;

    const { payload } = await jwtVerify(sessionCookie.value, secretKey);
    return payload.uuid as string;
  } catch (e) {
    console.warn('[Session] jwtVerify failed:', e);
    return null;
  }
}

export async function getFedCmSessionUuid(): Promise<string | null> {
  const secretKey = getSecretKey();

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(FEDCM_SESSION_COOKIE_NAME);
    if (!sessionCookie) return null;

    const { payload } = await jwtVerify(sessionCookie.value, secretKey);
    if (payload.purpose !== FEDCM_SESSION_PURPOSE || typeof payload.uuid !== "string") {
      return null;
    }

    return payload.uuid;
  } catch (e) {
    console.warn('[FedCM Session] jwtVerify failed:', e);
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
    .sign(getSecretKey());
}

export async function createFedCmSessionToken(uuid: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    uuid,
    purpose: FEDCM_SESSION_PURPOSE,
    lastTouched: now,
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime("365d")
    .sign(getSecretKey());
}

export async function setFedCmSessionCookie(uuid: string) {
  const cookieStore = await cookies();
  const sessionToken = await createFedCmSessionToken(uuid);

  cookieStore.set(FEDCM_SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: FEDCM_SESSION_COOKIE_PATH,
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearFedCmSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(FEDCM_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: FEDCM_SESSION_COOKIE_PATH,
    maxAge: 0,
  });
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
    maxAge: SESSION_MAX_AGE,
  });

  await setFedCmSessionCookie(uuid);
}
