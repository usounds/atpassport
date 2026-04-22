import { NextRequest, NextResponse } from "next/server";
import { getSessionUuid } from "@/lib/session";
import { createShareToken } from "@/lib/share";
import { getAssociations } from "@/lib/models";
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

  // 登録済みのハンドルがあるかチェック
  const associations = await getAssociations(uuid);
  if (associations.length === 0) {
    return NextResponse.json({ error: "No handles registered" }, { status: 403 });
  }

  // セッションUUIDベースのレート制限 (1分間に5回まで)
  if (isRateLimited(`api:share:uuid:${uuid}`, 5, 60000)) {
    return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
  }

  try {
    const token = await createShareToken(uuid);
    return NextResponse.json({ token, expiresAt: Math.floor(Date.now() / 1000) + 300 });
  } catch (error) {
    console.error("Failed to create share token:", error);
    return NextResponse.json({ error: "Failed to create share token" }, { status: 500 });
  }
}
