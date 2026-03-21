import { NextRequest, NextResponse } from "next/server";
import { getSessionUuid } from "@/lib/session";
import { deleteAssociation } from "@/lib/models";

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const did = searchParams.get("did");

  if (!did) {
    return NextResponse.json({ error: "Missing did" }, { status: 400 });
  }

  const uuid = await getSessionUuid();
  if (!uuid) {
    return NextResponse.json({ error: "No session found" }, { status: 401 });
  }
  await deleteAssociation(uuid, did);

  return NextResponse.json({ success: true });
}
