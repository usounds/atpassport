import { NextResponse } from "next/server";
import {
  FEDCM_ACCOUNTS_URL,
  FEDCM_CONFIG_URL,
  FEDCM_LOGIN_URL,
} from "@/lib/fedcm";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    {
      provider_urls: [FEDCM_CONFIG_URL],
      accounts_endpoint: FEDCM_ACCOUNTS_URL,
      login_url: FEDCM_LOGIN_URL,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
