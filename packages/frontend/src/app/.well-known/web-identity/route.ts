import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/fedcm";

export const dynamic = "force-dynamic";

const PREVIEW_CONFIG_URL = "https://preview.atpassport.net/fedcm/config.json";

export function GET(request: Request) {
  const origin = getPublicRequestOrigin(request);
  const selfConfigUrl = `${origin}/fedcm/config.json`;
  const providerUrls = Array.from(
    new Set([selfConfigUrl, PREVIEW_CONFIG_URL]),
  );

  return NextResponse.json(
    {
      provider_urls: providerUrls,
      accounts_endpoint: `${origin}/api/fedcm/accounts`,
      login_url: `${origin}/en/fedcm/login`,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
