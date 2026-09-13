import { NextResponse } from "next/server";
import {
  fedCmCorsHeaders,
  isFedCmRequest,
  validateFedCmClient,
} from "@/lib/fedcm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isFedCmRequest(request)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const url = new URL(request.url);
  const client = await validateFedCmClient(
    request.headers.get("origin"),
    url.searchParams.get("client_id"),
  );
  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 403 });
  }

  const metadata: Record<string, string> = {};
  if (client.registration?.privacyPolicyUrl) {
    metadata.privacy_policy_url = client.registration.privacyPolicyUrl;
  }
  if (client.registration?.termsOfServiceUrl) {
    metadata.terms_of_service_url = client.registration.termsOfServiceUrl;
  }

  return NextResponse.json(metadata, {
    headers: fedCmCorsHeaders(client.origin),
  });
}
