import { NextResponse } from 'next/server';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { getVerifiedDomainFromDb, verifyDomainInDb } from '@/lib/security';
import { NetAtpassportVerifyUpdate } from '@/lexicons/index';
import { isRateLimited } from '@/lib/rate-limit';
import { domainSchema } from '@/lib/schemas';

export const dynamic = 'force-dynamic';

function normalizeVerifiedDomainPolicyUrl(
  value: string | null | undefined,
  domain: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 2048) throw new Error("invalid_policy_url");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("invalid_policy_url");
  }

  const hostname = url.hostname.toLowerCase();
  const verifiedDomain = domain.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (hostname !== verifiedDomain && !hostname.endsWith(`.${verifiedDomain}`))
  ) {
    throw new Error("invalid_policy_url");
  }

  return url.href;
}

export async function POST(request: Request) {
  try {
    // 1. JWT validation (Service Auth)
    const did = await verifyServiceAuth(request, 'net.atpassport.verify.update');
    
    if (!did) {
      const output: NetAtpassportVerifyUpdate.Output = { success: false, error: 'Unauthorized: Invalid Service Auth token' };
      return NextResponse.json(output, { status: 401 });
    }

    // 2. Rate limiting by DID
    if (isRateLimited(did, 10, 60000)) {
      const output: NetAtpassportVerifyUpdate.Output = { success: false, error: 'Too many requests. Please try again later.' };
      return NextResponse.json(output, { status: 429 });
    }

    // 3. Parse input
    const body: NetAtpassportVerifyUpdate.Input = await request.json();
    const domain = body.domain;
    const isPublic = Boolean(body.isPublic);

    if (!domain) {
      const output: NetAtpassportVerifyUpdate.Output = { success: false, error: 'Missing domain to update' };
      return NextResponse.json(output, { status: 400 });
    }

    const lowerDomain = domain.toLowerCase().trim();
    const validation = domainSchema.safeParse(lowerDomain);
    if (!validation.success) {
      const output: NetAtpassportVerifyUpdate.Output = { success: false, error: 'Invalid domain format' };
      return NextResponse.json(output, { status: 400 });
    }

    // 4. Check ownership in DB
    const existing = await getVerifiedDomainFromDb(lowerDomain);
    if (!existing || existing.verifiedByDid !== did) {
      const output: NetAtpassportVerifyUpdate.Output = { success: false, error: 'Unauthorized or domain not found' };
      return NextResponse.json(output, { status: 403 });
    }

    // 5. Normalize policy URLs
    let normalizedPrivacyPolicyUrl: string | null | undefined;
    let normalizedTermsOfServiceUrl: string | null | undefined;
    try {
      normalizedPrivacyPolicyUrl = normalizeVerifiedDomainPolicyUrl(body.privacyPolicyUrl, lowerDomain);
      normalizedTermsOfServiceUrl = normalizeVerifiedDomainPolicyUrl(body.termsOfServiceUrl, lowerDomain);
    } catch {
      const output: NetAtpassportVerifyUpdate.Output = { success: false, error: 'invalid_policy_url' };
      return NextResponse.json(output, { status: 400 });
    }

    await verifyDomainInDb(lowerDomain, did, isPublic, existing.method || 'oauth', {
      privacyPolicyUrl:
        normalizedPrivacyPolicyUrl === undefined
          ? existing.privacyPolicyUrl
          : normalizedPrivacyPolicyUrl,
      termsOfServiceUrl:
        normalizedTermsOfServiceUrl === undefined
          ? existing.termsOfServiceUrl
          : normalizedTermsOfServiceUrl,
    });

    const output: NetAtpassportVerifyUpdate.Output = { success: true };
    return NextResponse.json(output);
  } catch (error: unknown) {
    console.error('[xrpc/net.atpassport.verify.update] Error:', error);
    const output: NetAtpassportVerifyUpdate.Output = { success: false, error: 'Internal server error' };
    return NextResponse.json(output, { status: 500 });
  }
}
