import { NextResponse } from "next/server";
import {
  createHandleAssistToken,
  fedCmCorsHeaders,
  isFedCmRequest,
  normalizeClientOrigin,
  validateFedCmClient,
} from "@/lib/fedcm";
import { getAssociations } from "@/lib/models";
import { getFedCmSessionUuid, getSessionUuid } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const normalizedOrigin = normalizeClientOrigin(origin);
  if (!normalizedOrigin) {
    return new Response(null, { status: 400 });
  }
  return new Response(null, {
    status: 200,
    headers: {
      ...fedCmCorsHeaders(normalizedOrigin),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request: Request) {
  if (!isFedCmRequest(request)) {
    console.warn("[FedCM Assertion] Rejected: not a FedCM request (missing Sec-Fetch-Dest)");
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
    console.warn("[FedCM Assertion] Rejected: invalid client", { origin: request.headers.get("origin"), clientId });
    return NextResponse.json({ error: "invalid_client" }, { status: 403 });
  }

  const corsHeaders = fedCmCorsHeaders(client.origin);
  const uuid = (await getFedCmSessionUuid()) || (await getSessionUuid());
  if (!uuid) {
    console.warn("[FedCM Assertion] Rejected: unauthorized (no FedCM or web session)");
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
