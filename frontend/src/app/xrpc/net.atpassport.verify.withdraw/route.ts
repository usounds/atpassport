import { NextResponse } from 'next/server';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { getVerifiedDomainFromDb, deleteVerifiedDomainFromDb } from '@/lib/security';
import { NetAtpassportVerifyWithdraw } from '@/lexicons/index';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // 1. JWTの検証とDIDの取得
    const did = await verifyServiceAuth(request);
    
    if (!did) {
      const output: NetAtpassportVerifyWithdraw.Output = { success: false, error: 'Unauthorized: Invalid Service Auth token' };
      return NextResponse.json(output, { status: 401 });
    }

    // 2. Rate limiting based on DID
    // Allow 10 withdrawals per minute per DID (more generous than submit)
    if (isRateLimited(did, 10, 60000)) {
      const output: NetAtpassportVerifyWithdraw.Output = { success: false, error: 'Too many requests. Please try again later.' };
      return NextResponse.json(output, { status: 429 });
    }

    // 3. リクエストボディから検証取り消し対象を取得
    const body: NetAtpassportVerifyWithdraw.Input = await request.json();
    const domain = body.domain;

    if (!domain) {
      const output: NetAtpassportVerifyWithdraw.Output = { success: false, error: 'Missing domain to withdraw' };
      return NextResponse.json(output, { status: 400 });
    }

    // 3. 所有権の確認と削除
    const existing = await getVerifiedDomainFromDb(domain);
    if (!existing || existing.verifiedByDid !== did) {
      const output: NetAtpassportVerifyWithdraw.Output = { success: false, error: "Unauthorized or domain not found" };
      return NextResponse.json(output, { status: 403 });
    }

    await deleteVerifiedDomainFromDb(domain);

    const output: NetAtpassportVerifyWithdraw.Output = { success: true };
    return NextResponse.json(output);
  } catch (error: unknown) {
    console.error('[xrpc/net.atpassport.verify.withdraw] Error:', error);
    const output: NetAtpassportVerifyWithdraw.Output = { success: false, error: 'Internal server error' };
    return NextResponse.json(output, { status: 500 });
  }
}
