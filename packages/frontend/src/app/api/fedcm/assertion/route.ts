import { NextResponse } from "next/server";
import {
  createHandleAssistToken,
  fedCmCorsHeaders,
  isFedCmRequest,
  validateFedCmClient,
} from "@/lib/fedcm";
import { getAssociations } from "@/lib/models";
import { getFedCmSessionUuid } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isFedCmRequest(request)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/x-www-form-urlencoded")) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const body = await request.formData();
  const clientId = body.get("client_id");
  const accountId = body.get("account_id");
  if (typeof clientId !== "string" || typeof accountId !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const client = await validateFedCmClient(request.headers.get("origin"), clientId);
  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 403 });
  }

  const corsHeaders = fedCmCorsHeaders(client.origin);
  const uuid = await getFedCmSessionUuid();
  if (!uuid) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: corsHeaders },
    );
  }

  const associations = await getAssociations(uuid);
  const selected = associations.find(({ did }) => did === accountId);
  if (!selected) {
    return NextResponse.json(
      { error: "invalid_account" },
      { status: 403, headers: corsHeaders },
    );
  }

  return NextResponse.json(
    { token: createHandleAssistToken(selected.did, selected.handle) },
    { headers: corsHeaders },
  );
}
