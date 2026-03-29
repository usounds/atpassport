import { NextRequest, NextResponse } from "next/server";
import { getSessionUuid } from "@/lib/session";
import { getAssociations } from "@/lib/models";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    // IPベースのレート制限 (1分間に20リクエストまで)
    if (isRateLimited(`api:handles:ip:${ip}`, 20, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const uuid = await getSessionUuid();
    if (!uuid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // セッションUUIDベースのレート制限 (1分間に20リクエストまで)
    if (isRateLimited(`api:handles:uuid:${uuid}`, 20, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const associations = await getAssociations(uuid);
    const handles = associations.map(a => a.handle);

    const response = NextResponse.json({ handles });

    // CORSの処理
    const origin = request.headers.get("origin");
    if (origin) {
      const ALLOWED_ORIGINS = [
        "https://atpassport.net",
        "http://localhost:3000",
        "http://localhost:3001",
        "chrome-extension://ollhnghmplgpoebaceomdaigpkihpfkn",
        "moz-extension://extension@atpassport.net"
      ];

      if (ALLOWED_ORIGINS.includes(origin)) {
        response.headers.set("Access-Control-Allow-Origin", origin);
        response.headers.set("Access-Control-Allow-Credentials", "true");
        response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      }
    }

    return response;
  } catch (e) {
    console.error("Handles API error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const response = new NextResponse(null, { status: 204 });

  if (origin) {
    const ALLOWED_ORIGINS = [
      "https://atpassport.net",
      "http://localhost:3000",
      "http://localhost:3001",
      "chrome-extension://ollhnghmplgpoebaceomdaigpkihpfkn",
      "moz-extension://extension@atpassport.net"
    ];

    if (ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
  }

  return response;
}
