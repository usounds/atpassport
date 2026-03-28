import { NextResponse } from 'next/server';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { verifyDomainInDb } from '@/lib/security';
import { resolveIdentity } from '@/lib/atproto-server';

export async function POST(request: Request) {
  try {
    // 1. JWTの取得と検証 (Service Auth)
    const did = await verifyServiceAuth(request);
    
    if (!did) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid Service Auth token' }, { status: 401 });
    }

    // 2. リクエストボディのパース
    const body = await request.json();
    const domain = body.domain;
    const isPublic = body.isPublic ?? true;

    // Case A: No domain specified - verify the authenticated handle (OAuth-like)
    if (!domain) {
      const identity = await resolveIdentity(did);
      if (!identity || !identity.handle) {
        return NextResponse.json({ success: false, error: 'Identity not found' }, { status: 400 });
      }
      await verifyDomainInDb(identity.handle, did, identity.handle, isPublic, 'oauth');
      return NextResponse.json({ success: true });
    }

    // Case B: Domain specified - verify via /.well-known/atpassport (File method)
    const lowerDomain = domain.toLowerCase().trim();
    if (!lowerDomain.includes('.')) {
      return NextResponse.json({ success: false, error: 'Invalid domain format' }, { status: 400 });
    }

    const url = `https://${lowerDomain}/.well-known/atpassport`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, { 
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({ 
          success: false, 
          error: `Could not reach ${url} (Status: ${response.status})` 
        }, { status: 400 });
      }

      const content = await response.text();
      const expectedPrefix = 'atpassport-verification:';
      if (!content.includes(expectedPrefix) || !content.includes(did)) {
        return NextResponse.json({ 
          success: false, 
          error: `Verification content mismatch. Expected: ${expectedPrefix} ${did}` 
        }, { status: 400 });
      }

      // 3. Register verified domain
      const identity = await resolveIdentity(did);
      const handle = identity?.handle || did;

      await verifyDomainInDb(lowerDomain, did, handle, isPublic, 'file');

      return NextResponse.json({ success: true });
    } catch (fetchError: unknown) {
      const error = fetchError as Error;
      console.warn(`[xrpc/net.atpassport.verify.submit] Fetch failed for ${url}:`, error.message);
      return NextResponse.json({ 
        success: false, 
        error: "Connection failed. Ensure HTTPS is working and the domain is correct." 
      }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('[xrpc/net.atpassport.verify.submit] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
