import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const host = request.headers.get("host") || "atpassport.net";

  return NextResponse.json(
    {
      "@context": ["https://www.w3.org/ns/did/v1"],
      id: `did:web:${host}`,
      service: [
        {
          id: "#atpassport_appview",
          type: "AtprotoAppView",
          serviceEndpoint: `https://${host}`,
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    },
  );
}
