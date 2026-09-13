import { NextResponse } from "next/server";
import { getFedCmSessionUuid } from "@/lib/session";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

export async function GET(request: Request) {
  if (request.headers.get("sec-fetch-site") !== "same-origin") {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(
    { ready: Boolean(await getFedCmSessionUuid()) },
    { headers: NO_STORE_HEADERS },
  );
}
