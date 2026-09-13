import { NextResponse } from "next/server";
import {
  getFedCmSessionUuid,
  getSessionUuid,
  setFedCmSessionCookie,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Origin",
};

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  if (
    request.headers.get("origin") !== requestOrigin ||
    request.headers.get("sec-fetch-site") !== "same-origin"
  ) {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  const [uuid, fedCmUuid] = await Promise.all([
    getSessionUuid(),
    getFedCmSessionUuid(),
  ]);
  if (uuid && fedCmUuid !== uuid) {
    await setFedCmSessionCookie(uuid);
  }

  return NextResponse.json(
    { ready: Boolean(uuid || fedCmUuid) },
    { headers: NO_STORE_HEADERS },
  );
}
