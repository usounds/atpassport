import { NextRequest, NextResponse } from "next/server";
import { getSessionUuid } from "@/lib/session";
import { addAssociation } from "@/lib/models";
import { resolveHandle } from "@/lib/atproto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle, callbackUrl } = body;

    if (!handle || !callbackUrl) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const uuid = await getSessionUuid();
    console.log(`[API/Register] UUID: ${uuid}, Handle: ${handle}`);

    if (!uuid) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    // 2. atcute の DoH リゾルバーを使用し、受け取った handle を解決（DIDを取得）する。
    const did = await resolveHandle(handle);
    console.log(`[API/Register] Resolved DID: ${did}`);

    if (did) {
      // 4. 解決成功時: 取得した DID、handle、および UUID を関連付けて DynamoDB に保存
      await addAssociation(uuid, did, handle);
      return NextResponse.json({ success: true, did, handle });
    } else {
      // 3. 解決失敗時: 404エラー
      return NextResponse.json({ error: "Handle not found" }, { status: 404 });
    }
  } catch (e) {
    console.error("[API/Register] Error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
