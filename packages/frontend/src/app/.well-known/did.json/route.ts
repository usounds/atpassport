import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const host = request.headers.get("host") || "atpassport.net";

  return NextResponse.json({
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: `did:web:${host}`,
    service: [
      {
        id: "#atpassport_appview",
        type: "AtprotoAppView",
        serviceEndpoint: `https://${host}`
      }
    ]
  });
}
