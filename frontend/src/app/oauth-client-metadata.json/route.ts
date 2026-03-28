import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  const headerList = await headers();
  const origin = headerList.get('origin') || process.env.NEXT_PUBLIC_URL || 'https://atpassport.net';

  const metadata = {
    "client_id": `${origin}/oauth-client-metadata.json`,
    "client_name": "@passport",
    "client_uri": origin,
    "redirect_uris": [
      `${origin}/en/developers/verify`,
      `${origin}/ja/developers/verify`
    ],
    "response_types": [
      "code"
    ],
    "grant_types": [
      "authorization_code",
      "refresh_token"
    ],
    "scope": "atproto include:net.atpassport.permissionSet",
    "token_endpoint_auth_method": "none",
    "application_type": "web",
    "dpop_bound_access_tokens": true
  };

  return NextResponse.json(metadata);
}
