import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(
    {
      accounts_endpoint: "/api/fedcm/accounts",
      client_metadata_endpoint: "/api/fedcm/client_metadata",
      id_assertion_endpoint: "/api/fedcm/assertion",
      login_url: "/en/fedcm/login",
      supports_use_other_account: true,
      branding: {
        background_color: "#18181b",
        color: "#ffffff",
        icons: [
          {
            url: "https://atpassport.net/icon128.png",
            size: 128,
          },
        ],
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
