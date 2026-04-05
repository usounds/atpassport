import { NextResponse } from 'next/server';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { NetAtpassportVerifySubmit } from '@/lexicons/index';
import { verifyDomainInDb } from '@/lib/security';
import { resolveIdentity } from '@/lib/atproto-server';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // 1. JWTの取得と検証 (Service Auth)
    const did = await verifyServiceAuth(request);
    
    if (!did) {
      const output: NetAtpassportVerifySubmit.Output = { success: false, error: 'Unauthorized: Invalid Service Auth token' };
      return NextResponse.json(output, { status: 401 });
    }

    // 2. DIDによるレート制限
    // 1つのDIDにつき、1分間に5リクエストまで許可
    if (isRateLimited(did, 5, 60000)) {
      const output: NetAtpassportVerifySubmit.Output = { success: false, error: 'Too many requests. Please try again later.' };
      return NextResponse.json(output, { status: 429 });
    }

    // 3. リクエストボディのパース
    const body: NetAtpassportVerifySubmit.Input = await request.json();
    const domain = body.domain;
    const isPublic = body.isPublic;

    if (!domain) {
      const output: NetAtpassportVerifySubmit.Output = { success: false, error: 'Domain is required' };
      return NextResponse.json(output, { status: 400 });
    }

    const lowerDomain = domain.toLowerCase().trim();
    
    // Resolve identity to check if it's the user's own handle for OAuth verification
    const identity = await resolveIdentity(did);
    if (identity && (identity.handle === lowerDomain || lowerDomain.endsWith('.' + identity.handle))) {
      await verifyDomainInDb(lowerDomain, did, isPublic, 'oauth');
      const output: NetAtpassportVerifySubmit.Output = { success: true };
      return NextResponse.json(output);
    }
    
    // 厳格なドメインバリデーション (SSRF対策)
    // - localhost不可
    // - IPアドレス（IPv4/IPv6）不可
    // - TLDを含むドメイン形式であること
    const domainRegex = /^(?!localhost$)(?!.*[\d]+\.[\d]+\.[\d]+\.[\d]+$)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(lowerDomain)) {
      return NextResponse.json({ success: false, error: 'Invalid domain format. IP addresses and localhost are not allowed.' }, { status: 400 });
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
        const output: NetAtpassportVerifySubmit.Output = { 
          success: false, 
          error: `Could not reach ${url} (Status: ${response.status})` 
        };
        return NextResponse.json(output, { status: 400 });
      }

      const content = await response.text();
      const expectedPrefix = 'atpassport-verification:';
      if (!content.includes(expectedPrefix) || !content.includes(did)) {
        const output: NetAtpassportVerifySubmit.Output = { 
          success: false, 
          error: `Verification content mismatch. Expected: ${expectedPrefix} ${did}` 
        };
        return NextResponse.json(output, { status: 400 });
      }

      // 3. Register verified domain
      await verifyDomainInDb(lowerDomain, did, isPublic, 'file');

      const output: NetAtpassportVerifySubmit.Output = { success: true };
      return NextResponse.json(output);
    } catch (fetchError: unknown) {
      const error = fetchError as Error;
      console.warn(`[xrpc/net.atpassport.verify.submit] Fetch failed for ${url}:`, error.message);
      const output: NetAtpassportVerifySubmit.Output = { 
        success: false, 
        error: "Connection failed. Ensure HTTPS is working and the domain is correct." 
      };
      return NextResponse.json(output, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('[xrpc/net.atpassport.verify.submit] Error:', error);
    const output: NetAtpassportVerifySubmit.Output = { success: false, error: 'Internal server error' };
    return NextResponse.json(output, { status: 500 });
  }
}
