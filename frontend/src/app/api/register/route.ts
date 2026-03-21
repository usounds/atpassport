import { NextRequest, NextResponse } from "next/server";
import { getSessionUuid } from "@/lib/session";
import { addAssociation } from "@/lib/models";
import { resolveIdentity } from "@/lib/atproto";

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

    const result = await resolveIdentity(handle);
    console.log(`[API/Register] Resolved:`, result);

    if (result && result.did && result.pdsUrl) {
      await addAssociation(uuid, result.did, handle, result.pdsUrl);
      return NextResponse.json({ success: true, did: result.did, handle });
    } else {
      return NextResponse.json({ error: "Handle not found or missing PDS" }, { status: 404 });
    }
  } catch (e) {
    console.error("[API/Register] Error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
