import { NextRequest, NextResponse } from "next/server";
import { getSessionUuid } from "@/lib/session";
import { getAssociations } from "@/lib/models";

export async function GET(request: NextRequest) {
  try {
    const uuid = await getSessionUuid();
    if (!uuid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const associations = await getAssociations(uuid);
    const handles = associations.map(a => a.handle);

    const response = NextResponse.json({ handles });

    // Handle CORS for browser extensions
    const origin = request.headers.get("origin");
    if (origin && (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://") || origin.includes("localhost") || origin.includes("atpassport.net"))) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

  if (origin && (origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://") || origin.includes("localhost") || origin.includes("atpassport.net"))) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  return response;
}
