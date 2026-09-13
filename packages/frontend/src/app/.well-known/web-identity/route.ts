import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/fedcm";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const origin = getPublicRequestOrigin(request);
  return NextResponse.json(
    {
      provider_urls: [`${origin}/fedcm/config.json`],
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
