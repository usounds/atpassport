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
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }

  if (
    request.headers.get("sec-fetch-site") !== "same-origin" ||
    !requestHost ||
    originHost !== requestHost
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
