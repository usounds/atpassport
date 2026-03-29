import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { routing } from '@/i18n/routing';

export async function GET() {
  const headerList = await headers();
  const host = headerList.get('host') || 'atpassport.net';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;

  const metadata = {
    "client_id": `${origin}/oauth-client-metadata.json`,
    "client_name": "@passport",
    "client_uri": origin,
    "tos_uri": `${origin}/terms`,
    "policy_uri": `${origin}/privacy`,
    "redirect_uris": [
      ...routing.locales.map(locale => `${origin}/${locale}/developers/verify`),
      `${origin}/developers/verify`
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
