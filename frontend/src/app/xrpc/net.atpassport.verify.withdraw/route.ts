import { NextResponse } from 'next/server';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { getVerifiedDomainFromDb, deleteVerifiedDomainFromDb } from '@/lib/security';

export async function POST(request: Request) {
  try {
    // 1. JWTの検証とDIDの取得
    const did = await verifyServiceAuth(request);
    
    if (!did) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid Service Auth token' }, { status: 401 });
    }

    // 2. リクエストボディから検証取り消し対象を取得
    const body = await request.json();
    const domain = body.domain;

    if (!domain) {
      return NextResponse.json({ success: false, error: 'Missing domain to withdraw' }, { status: 400 });
    }

    // 3. 所有権の確認と削除
    const existing = await getVerifiedDomainFromDb(domain);
    if (!existing || existing.verifiedByDid !== did) {
      return NextResponse.json({ success: false, error: "Unauthorized or domain not found" }, { status: 403 });
    }

    await deleteVerifiedDomainFromDb(domain);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[xrpc/net.atpassport.verify.withdraw] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
