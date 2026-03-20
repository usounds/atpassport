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
  await deleteAssociation(uuid, did);

  return NextResponse.json({ success: true });
}
