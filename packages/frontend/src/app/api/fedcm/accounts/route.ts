import { NextResponse } from "next/server";
import { isFedCmRequest } from "@/lib/fedcm";
import { getAssociations } from "@/lib/models";
import { getFedCmSessionUuid } from "@/lib/session";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

export async function GET(request: Request) {
  if (!isFedCmRequest(request)) {
    return NextResponse.json(
      { error: "invalid_request" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const uuid = await getFedCmSessionUuid();
  if (!uuid) {
    return NextResponse.json(
      { error: "unauthorized" },
      {
        status: 401,
        headers: { ...NO_STORE_HEADERS, "Set-Login": "logged-out" },
      },
    );
  }

  const associations = await getAssociations(uuid);
  const loginStatus = associations.length > 0 ? "logged-in" : "logged-out";
  return NextResponse.json(
    {
      accounts: associations.map(({ did, handle }) => ({
        id: did,
        username: handle,
        approved_clients: [],
      })),
    },
    {
      headers: { ...NO_STORE_HEADERS, "Set-Login": loginStatus },
    },
  );
}
