import { getVerifiedDomainFromDb, type VerifiedDomain } from "./security";

export type FedCmHandleAssistPayload = {
  v: 1;
  did: string;
  handle: string;
};

export function getPublicRequestOrigin(request: Request): string {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || requestUrl.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

export function isFedCmRequest(request: Request): boolean {
  return request.headers.get("sec-fetch-dest")?.toLowerCase() === "webidentity";
}

export function normalizeClientOrigin(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      return null;
    }

    const isLoopback =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]" ||
      url.hostname.endsWith(".localhost");

    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export async function getFedCmClientRegistration(
  origin: string,
): Promise<VerifiedDomain | null> {
  const normalizedOrigin = normalizeClientOrigin(origin);
  if (!normalizedOrigin) return null;

  const { hostname } = new URL(normalizedOrigin);
  const lowerHostname = hostname.toLowerCase();
  const isLoopback =
    lowerHostname === "localhost" ||
    lowerHostname === "127.0.0.1" ||
    lowerHostname === "[::1]" ||
    lowerHostname.endsWith(".localhost");

  if (isLoopback || normalizedOrigin === "https://atpassport.net") return null;

  const parts = lowerHostname.split(".");
  for (let index = 0; index < parts.length - 1; index += 1) {
    const candidate = parts.slice(index).join(".");
    const verifiedDomain = await getVerifiedDomainFromDb(candidate);
    if (verifiedDomain && (index === 0 || verifiedDomain.method !== "file")) {
      return verifiedDomain;
    }
  }

  return null;
}

export async function isRegisteredFedCmClient(origin: string): Promise<boolean> {
  const normalizedOrigin = normalizeClientOrigin(origin);
  if (!normalizedOrigin) return false;

  const { hostname } = new URL(normalizedOrigin);
  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost");

  if (isLoopback) return process.env.NODE_ENV !== "production";
  if (normalizedOrigin === "https://atpassport.net") return true;
  return (await getFedCmClientRegistration(normalizedOrigin)) !== null;
}

export async function validateFedCmClient(
  originHeader: string | null,
  clientId: string | null,
): Promise<{ origin: string; registration: VerifiedDomain | null } | null> {
  const origin = normalizeClientOrigin(originHeader);
  const normalizedClientId = normalizeClientOrigin(clientId);
  if (!origin || !normalizedClientId || origin !== normalizedClientId) {
    return null;
  }

  if (origin === "https://atpassport.net") {
    return { origin, registration: null };
  }

  const { hostname } = new URL(origin);
  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost");
  if (isLoopback && process.env.NODE_ENV !== "production") {
    return { origin, registration: null };
  }

  const registration = await getFedCmClientRegistration(origin);
  return registration ? { origin, registration } : null;
}

export function createHandleAssistToken(did: string, handle: string): string {
  return JSON.stringify({ v: 1, did, handle } satisfies FedCmHandleAssistPayload);
}

export function fedCmCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Origin, Cookie",
  };
}
