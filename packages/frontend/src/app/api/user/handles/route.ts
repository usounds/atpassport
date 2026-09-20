import { NextRequest, NextResponse } from "next/server";
import { getSessionUuid } from "@/lib/session";
import { getAssociations } from "@/lib/models";
import { isRateLimited } from "@/lib/rate-limit";
import { getProfiles } from "@/lib/atproto";

export const dynamic = 'force-dynamic';

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return (
    origin === "https://atpassport.net" ||
    origin === "https://preview.atpassport.net" ||
    origin === "http://localhost:3000" ||
    origin === "http://localhost:3001" ||
    origin === "chrome-extension://ollhnghmplgpoebaceomdaigpkihpfkn" ||
    origin.startsWith("moz-extension://")
  );
}

function applyCors(response: NextResponse, origin: string | null): NextResponse {
  if (isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin!);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  return response;
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    // IPベースのレート制限 (1分間に20リクエストまで)
    if (isRateLimited(`api:handles:ip:${ip}`, 20, 60000)) {
      return applyCors(NextResponse.json({ error: "Too many requests" }, { status: 429 }), origin);
    }

    const uuid = await getSessionUuid();
    if (!uuid) {
      return applyCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), origin);
    }

    // セッションUUIDベースのレート制限 (1分間に20リクエストまで)
    if (isRateLimited(`api:handles:uuid:${uuid}`, 20, 60000)) {
      return applyCors(NextResponse.json({ error: "Too many requests" }, { status: 429 }), origin);
    }

    const associations = await getAssociations(uuid);
    let profiles: Awaited<ReturnType<typeof getProfiles>> = {};
    try {
      profiles = await getProfiles(associations.map(({ did }) => did));
    } catch (error) {
      console.warn("[Handles API] Failed to fetch account avatars:", error);
    }

    const handles = associations.map(a => a.handle);
    const accounts = associations.map(({ did, handle }) => {
      const displayName = profiles[did]?.displayName?.trim();
      const avatar = profiles[did]?.avatar;
      return {
        did,
        handle,
        displayName: displayName || undefined,
        avatar: avatar || undefined,
      };
    });

    return applyCors(NextResponse.json({ handles, accounts }), origin);
  } catch (e) {
    console.error("Handles API error:", e);
    return applyCors(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }), origin);
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return applyCors(new NextResponse(null, { status: 204 }), origin);
}
