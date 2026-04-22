const rateLimitMap = new Map<string, { count: number; lastRequest: number }>();

/**
 * IPアドレスに基づいた簡易的なメモリ内レートリミッター。
 * 注意: AWS Lambdaのようなサーバーレス環境では、このキャッシュはインスタンスごとに保持されます。
 * @param ip チェック対象のIPアドレスまたはID
 * @param limit ウィンドウ内での最大リクエスト許容数
 * @param windowMs ミリ秒単位の時間ウィンドウ（例: 1分なら 60000）
 * @returns 制限を超えている場合は true、許可される場合は false
 */
export function isRateLimited(ip: string, limit: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userData = rateLimitMap.get(ip);

  // 定期的に古いエントリーをクリーンアップ（1000エントリーを超えた場合）
  if (rateLimitMap.size > 1000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now - value.lastRequest > windowMs * 2) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!userData || now - userData.lastRequest > windowMs) {
    // リセットまたは新規エントリー
    rateLimitMap.set(ip, { count: 1, lastRequest: now });
    return false;
  }

  if (userData.count >= limit) {
    return true;
  }

  userData.count += 1;
  userData.lastRequest = now;
  return false;
}

/**
 * テスト用: レート制限マップをクリアします。
 */
export function resetRateLimit(): void {
  rateLimitMap.clear();
}
