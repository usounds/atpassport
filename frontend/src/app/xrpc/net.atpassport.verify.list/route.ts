import { NextResponse } from 'next/server';
import { getVerifiedDomainsByDid } from '@/lib/security';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { NetAtpassportVerifyList } from '@/lexicons/index';

export async function GET(request: Request) {
  try {
    // 1. JWT validation (Service Auth)
    const did = await verifyServiceAuth(request);
    
    if (!did) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch domains for this specific DID
    const domains = await getVerifiedDomainsByDid(did);
    
    const output: NetAtpassportVerifyList.Output = {
      success: true,
      domains: domains.map(d => ({
        domain: d.domain as NetAtpassportVerifyList.Domain['domain'],
        handle: d.handle as NetAtpassportVerifyList.Domain['handle'],
        status: d.status as NetAtpassportVerifyList.Domain['status'],
        verifiedAt: d.verifiedAt,
        isPublic: d.isPublic === 'true',
        method: d.method as NetAtpassportVerifyList.Domain['method']
      }))
    };
    
    return NextResponse.json(output);
  } catch (error: unknown) {
    console.error('[xrpc/net.atpassport.verify.list] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
