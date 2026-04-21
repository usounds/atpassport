import { NextResponse } from 'next/server';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { NetAtpassportVerifySubmit } from '@/lexicons/index';
import { verifyDomainInDb } from '@/lib/security';
import { resolveIdentity } from '@/lib/atproto-server';
import { isRateLimited } from '@/lib/rate-limit';
import net from 'node:net';

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
    if (net.isIP(lowerDomain)) {
      return NextResponse.json({ success: false, error: 'Invalid domain format. IP addresses are not allowed.' }, { status: 400 });
    }

    // Relaxed regex for local testing
    const isDev = process.env.NODE_ENV === 'development';
    const domainRegex = isDev 
      ? /^([a-z0-9.-]+)(:[0-9]+)?$/ 
      : /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/;
    
    if (!domainRegex.test(lowerDomain)) {
      return NextResponse.json({ success: false, error: `Invalid domain format (server): ${lowerDomain}` }, { status: 400 });
    }

    // Block localhost in production for security (SSRF prevention)
    if (!isDev && (lowerDomain === 'localhost' || lowerDomain.endsWith('.localhost'))) {
      return NextResponse.json({ success: false, error: 'Localhost is not allowed in production.' }, { status: 400 });
    }

    const protocol = (isDev && (lowerDomain.startsWith('localhost') || lowerDomain.includes('127.0.0.1'))) ? 'http' : 'https';
    const url = `${protocol}://${lowerDomain}/.well-known/atpassport`;
    
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
          error: 'unreachable_url' 
        };
        return NextResponse.json(output, { status: 400 });
      }

      const content = await response.text();
      const expectedPrefix = 'atpassport-verification:';
      if (!content.includes(expectedPrefix) || !content.includes(did)) {
        const output: NetAtpassportVerifySubmit.Output = { 
          success: false, 
          error: 'verification_mismatch'
        };
        return NextResponse.json(output, { status: 400 });
      }

      // 3. Register verified domain
      await verifyDomainInDb(lowerDomain, did, isPublic, 'file');

      const output: NetAtpassportVerifySubmit.Output = { success: true };
      return NextResponse.json(output);
    } catch (fetchError: unknown) {
      const error = fetchError as Error;
      console.warn('[xrpc/net.atpassport.verify.submit] Fetch failed for %s:', url, error.message);
      const output: NetAtpassportVerifySubmit.Output = { 
        success: false, 
        error: "connection_failed" 
      };
      return NextResponse.json(output, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('[xrpc/net.atpassport.verify.submit] Error:', error);
    const output: NetAtpassportVerifySubmit.Output = { success: false, error: 'Internal server error' };
    return NextResponse.json(output, { status: 500 });
  }
}
