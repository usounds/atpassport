import { NextRequest, NextResponse } from "next/server";
import { getSessionUuid } from "@/lib/session";
import { createShareToken } from "@/lib/share";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  
  if (isRateLimited(ip, 5, 60000)) {
    return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
  }

  const uuid = await getSessionUuid();

  if (!uuid) {
    return NextResponse.json({ error: "No session found" }, { status: 401 });
  }

  try {
    const token = await createShareToken(uuid);
    return NextResponse.json({ token, expiresAt: Math.floor(Date.now() / 1000) + 300 });
  } catch (error) {
    console.error("Failed to create share token:", error);
    return NextResponse.json({ error: "Failed to create share token" }, { status: 500 });
  }
}
