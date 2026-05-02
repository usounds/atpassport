import { NextResponse } from 'next/server';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { NetAtpassportVerifySubmit } from '@/lexicons/index';
import { verifyDomainInDb } from '@/lib/security';
import { resolveIdentity } from '@/lib/atproto-server';
import { isRateLimited } from '@/lib/rate-limit';
import { domainSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
import net from 'node:net';
import dns from 'node:dns/promises';

/**
 * Checks if an IP address belongs to a private, loopback, or link-local range.
 * This is used to prevent SSRF attacks.
 */
function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    return (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0
    );
  }
  if (net.isIPv6(ip)) {
    const lowerIp = ip.toLowerCase();
    return (
      lowerIp === '::1' ||
      lowerIp.startsWith('fe80:') ||
      lowerIp.startsWith('fc00:') ||
      lowerIp.startsWith('fd00:')
    );
  }
  return true; // Reject unknown formats for safety
}

export async function POST(request: Request) {
  try {
    // 1. JWTの取得と検証 (Service Auth)
    const did = await verifyServiceAuth(request);
    
    if (!did) {
      const response = NextResponse.json({ success: false, error: 'unauthorized', message: 'Invalid Service Auth token' }, { status: 401 });
      return response;
    }

    // 2. DIDによるレート制限
    // 1つのDIDにつき、1分間に5リクエストまで許可
    if (isRateLimited(did, 5, 60000)) {
      const response = NextResponse.json({ success: false, error: 'rate_limited', message: 'Too many requests. Please try again later.' }, { status: 429 });
      return response;
    }

    // 3. リクエストボディのパース
    const body: NetAtpassportVerifySubmit.Input = await request.json();
    const domain = body.domain;
    const isPublic = body.isPublic;

    if (!domain) {
      const response = NextResponse.json({ success: false, error: 'invalid_request', message: 'Domain is required' }, { status: 400 });
      return response;
    }

    const lowerDomain = domain.toLowerCase().trim();
    
    // 入力バリデーション
    const validation = domainSchema.safeParse(lowerDomain);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'invalid_request', message: 'Invalid domain format' }, { status: 400 });
    }

    // Resolve identity to check if it's the user's own handle for OAuth verification
    const identity = await resolveIdentity(did);
    if (identity && (identity.handle === lowerDomain || lowerDomain.endsWith('.' + identity.handle))) {
      await verifyDomainInDb(lowerDomain, did, isPublic, 'oauth');
      const output: NetAtpassportVerifySubmit.Output = { success: true };
      const response = NextResponse.json(output);
      return response;
    }
    
    // 厳格なドメインバリデーション (SSRF対策)
    // - localhost不可
    // - IPアドレス（IPv4/IPv6）不可
    // - TLDを含むドメイン形式であること
    if (net.isIP(lowerDomain)) {
      const response = NextResponse.json({ success: false, error: 'invalid_request', message: 'Invalid domain format. IP addresses are not allowed.' }, { status: 400 });
      return response;
    }

    // Relaxed regex for local testing
    const isDev = process.env.NODE_ENV === 'development';
    const domainRegex = isDev 
      ? /^([a-z0-9.-]+)(:[0-9]+)?$/ 
      : /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/;
    
    if (!domainRegex.test(lowerDomain)) {
      const response = NextResponse.json({ success: false, error: 'invalid_request', message: `Invalid domain format (server): ${lowerDomain}` }, { status: 400 });
      return response;
    }

    // Block localhost in production for security (SSRF prevention)
    if (!isDev && (lowerDomain === 'localhost' || lowerDomain.endsWith('.localhost'))) {
      const response = NextResponse.json({ success: false, error: 'invalid_request', message: 'Localhost is not allowed in production.' }, { status: 400 });
      return response;
    }

    // SSRF protection: Resolve domain and check for private IP addresses
    if (!isDev) {
      try {
        const lookup = await dns.lookup(lowerDomain, { all: true });
        const isUnsafe = lookup.some(addr => isPrivateIp(addr.address));
        if (isUnsafe) {
          console.warn(`[xrpc/net.atpassport.verify.submit] SSRF Attempt blocked: ${lowerDomain} resolved to private IP`);
          return NextResponse.json({ 
            success: false, 
            error: 'invalid_request', 
            message: 'Access to private network addresses is not allowed.' 
          }, { status: 400 });
        }
      } catch (dnsError) {
        console.warn(`[xrpc/net.atpassport.verify.submit] DNS Lookup failed for ${lowerDomain}:`, dnsError);
        return NextResponse.json({ 
          success: false, 
          error: 'invalid_request', 
          message: 'Could not resolve domain name.' 
        }, { status: 400 });
      }
    }

    const protocol = (isDev && (lowerDomain.startsWith('localhost') || lowerDomain.includes('127.0.0.1'))) ? 'http' : 'https';
    const url = `${protocol}://${lowerDomain}/.well-known/atpassport`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const fetchRes = await fetch(url, { 
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!fetchRes.ok) {
        const res = NextResponse.json({ 
          success: false, 
          error: 'unreachable_url',
          message: `Could not reach ${url}: ${fetchRes.statusText}`
        }, { status: 400 });
        return res;
      }

      const content = await fetchRes.text();
      const expectedPrefix = 'atpassport-verification:';
      if (!content.includes(expectedPrefix) || !content.includes(did)) {
        const res = NextResponse.json({ 
          success: false, 
          error: 'verification_mismatch',
          message: 'The file content does not match the expected verification string.'
        }, { status: 400 });
        return res;
      }

      // 3. Register verified domain
      await verifyDomainInDb(lowerDomain, did, isPublic, 'file');

      const output: NetAtpassportVerifySubmit.Output = { success: true };
      const res = NextResponse.json(output);
      return res;
    } catch (fetchError: unknown) {
      const error = fetchError as Error;
      console.warn('[xrpc/net.atpassport.verify.submit] Fetch failed for %s:', url, error.message);
      const res = NextResponse.json({ 
        success: false, 
        error: "connection_failed",
        message: error.message || 'Connection failed'
      }, { status: 400 });
      return res;
    }
  } catch (error: unknown) {
    console.error('[xrpc/net.atpassport.verify.submit] Error:', error);
    const response = NextResponse.json({ success: false, error: 'internal_error', message: 'Internal server error' }, { status: 500 });
    return response;
  }
}
