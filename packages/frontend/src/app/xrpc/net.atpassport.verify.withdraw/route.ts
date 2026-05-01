import { NextResponse } from 'next/server';
import { verifyServiceAuth } from '@/lib/verify-service-auth';
import { getVerifiedDomainFromDb, deleteVerifiedDomainFromDb } from '@/lib/security';
import { NetAtpassportVerifyWithdraw } from '@/lexicons/index';
import { isRateLimited } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. JWTの検証とDIDの取得
    const did = await verifyServiceAuth(request);
    
    if (!did) {
      const output: NetAtpassportVerifyWithdraw.Output = { success: false, error: 'Unauthorized: Invalid Service Auth token' };
      const response = NextResponse.json(output, { status: 401 });
      return response;
    }

    // 2. DIDによるレート制限
    // 1つのDIDにつき、1分間に10リクエストまで許可（submitより緩和）
    if (isRateLimited(did, 10, 60000)) {
      const output: NetAtpassportVerifyWithdraw.Output = { success: false, error: 'Too many requests. Please try again later.' };
      const response = NextResponse.json(output, { status: 429 });
      return response;
    }

    // 3. リクエストボディから検証取り消し対象を取得
    const body: NetAtpassportVerifyWithdraw.Input = await request.json();
    const domain = body.domain;

    if (!domain) {
      const output: NetAtpassportVerifyWithdraw.Output = { success: false, error: 'Missing domain to withdraw' };
      const response = NextResponse.json(output, { status: 400 });
      return response;
    }

    // 3. 所有権の確認と削除
    const existing = await getVerifiedDomainFromDb(domain);
    if (!existing || existing.verifiedByDid !== did) {
      const output: NetAtpassportVerifyWithdraw.Output = { success: false, error: "Unauthorized or domain not found" };
      const response = NextResponse.json(output, { status: 403 });
      return response;
    }

    await deleteVerifiedDomainFromDb(domain);

    const output: NetAtpassportVerifyWithdraw.Output = { success: true };
    const response = NextResponse.json(output);
    return response;
  } catch (error: unknown) {
    console.error('[xrpc/net.atpassport.verify.withdraw] Error:', error);
    const output: NetAtpassportVerifyWithdraw.Output = { success: false, error: 'Internal server error' };
    const response = NextResponse.json(output, { status: 500 });
    return response;
  }
}
