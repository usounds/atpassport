'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUuid, createSessionToken, SESSION_COOKIE_NAME, refreshSession } from './session';
import { getAssociations, updateAssociation, deleteAssociation, addAssociation } from './models';
import { resolveIdentity, resolveDidDocument } from './atproto-server';
import { getUuidByShareToken } from './share';
import { cookies, headers } from 'next/headers';
import { isRateLimited } from './rate-limit';
import { verifyDomainInDb, getVerifiedDomainFromDb, getVerifiedDomainsByDid, VerifiedDomain, deleteVerifiedDomainFromDb } from './security';

/**
 * 手動でセッションの有効期限を延長します。
 */
export async function touchSessionAction() {
  await refreshSession();
}

/**
 * DID からハンドル名を解決します。
 */
export async function resolveHandle(did: string) {
  const headerList = await headers();
  const host = headerList.get('host') || '';
  const isE2E = process.env.E2E_TEST === "true" || host.includes(':3001');

  if (isE2E && (did === "test.bsky.social" || did === "did:plc:mock")) {
    return {
      did: "did:plc:mock",
      handle: "test.bsky.social",
      pdsUrl: "http://localhost:3001"
    };
  }
  return await resolveIdentity(did);
}

/**
 * DID ドキュメントを解決します。
 */
export async function resolveDidDoc(did: string) {
  const headerList = await headers();
  const host = headerList.get('host') || '';
  const isE2E = process.env.E2E_TEST === "true" || host.includes(':3001');

  if (isE2E && did === "did:plc:mock") {
    return {
      id: "did:plc:mock",
      service: [
        {
          id: "#atproto_pds",
          type: "AtprotoPersonalDataServer",
          serviceEndpoint: "http://localhost:3001"
        }
      ]
    };
  }
  return await resolveDidDocument(did);
}

/**
 * ドメイン検証を取り消します。
 */
export async function withdrawDomain(domain: string, did: string) {
  try {
    const uuid = await getSessionUuid();
    if (!uuid) return { success: false, error: "No session found" };

    // 権限チェック: 
    // 1. セッションにそのDIDが紐付いていること (Passportとしての所有)
    const associations = await getAssociations(uuid);
    if (!associations.some(a => a.did === did)) {
      return { success: false, error: "DID not associated with your account" };
    }

    // 2. DB上の登録者がそのDIDであること (ドメイン自体の所有者)
    const existing = await getVerifiedDomainFromDb(domain);
    if (!existing || existing.verifiedByDid !== did) {
      return { success: false, error: "Unauthorized or domain not found" };
    }

    await deleteVerifiedDomainFromDb(domain);
    
    revalidatePath('/[locale]/directory');
    revalidatePath('/[locale]/developers/verify');
    
    await refreshSession();
    return { success: true };
  } catch (error) {
    console.error('[ServerAction:withdrawDomain] ERROR:', error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * ドメインの設定（公開状態など）を更新します。
 */
export async function updateDomainSettings(domain: string, did: string, isPublic: boolean) {
  try {
    const uuid = await getSessionUuid();
    if (!uuid) return { success: false, error: "No session found" };

    // 権限チェック:
    // 1. セッションにそのDIDが紐付いていること
    const associations = await getAssociations(uuid);
    if (!associations.some(a => a.did === did)) {
      return { success: false, error: "DID not associated with your account" };
    }

    // 2. DB上の登録者がそのDIDであること
    const existing = await getVerifiedDomainFromDb(domain);
    if (!existing || existing.verifiedByDid !== did) {
      return { success: false, error: "Unauthorized or domain not found" };
    }

    await verifyDomainInDb(domain, did, isPublic, existing.method || 'oauth');
    
    revalidatePath('/[locale]/directory');
    revalidatePath('/[locale]/developers/verify');
    
    await refreshSession();
    return { success: true };
  } catch (error) {
    console.error('[ServerAction:updateDomainSettings] ERROR:', error);
    return { success: false, error: "Internal server error" };
  }
}

/**
 * 基幹互換性のためのエイリアス
 */
export async function withdrawDomainViaOAuth(did: string) {
  const identity = await resolveIdentity(did);
  if (!identity || !identity.handle) return { success: false };
  return await withdrawDomain(identity.handle, did);
}

export async function registerHandle(handle: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Rate limiting based on IP
    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for") || "anonymous";
    const limit = process.env.E2E_TEST === "true" ? 100 : 15;
    if (isRateLimited(`action:register:${ip}`, limit, 60000)) {
      console.warn(`[ServerAction:registerHandle] Rate limited for IP: ${ip}`);
      return { success: false, error: "Too many requests. Please try again later." };
    }

    const uuid = await getSessionUuid();
    if (!uuid) return { success: false, error: "No session found" };

    const result = await resolveIdentity(handle);
    if (!result || !result.did || !result.pdsUrl || !result.handle) {
      return { success: false, error: "Handle not found or missing PDS" };
    }

    const { did, pdsUrl, handle: resolvedHandle } = result;
    const associations = await getAssociations(uuid);
    
    console.log(`[registerHandle] Registering handle: ${resolvedHandle} (DID: ${did}) for UUID: ${uuid}`);

    // DIDベースで既存の登録を確認
    const existing = associations.find(a => a.did === did);

    if (existing) {
      // 既にDIDが登録されている場合は、最新のハンドルとPDS URLで更新する
      await updateAssociation(uuid, did, {
        handle: resolvedHandle,
        pdsUrl: pdsUrl
      });
    } else {
      // 新規登録
      await addAssociation(uuid, did, resolvedHandle, pdsUrl);
    }
    
    revalidatePath('/[locale]', 'page');
    await refreshSession();
    return { success: true };
  } catch (error: unknown) {
    console.error('[ServerAction:registerHandle] ERROR:', error);
    return { success: false, error: "Internal server error" };
  }
}

export async function setPrimaryAssociation(did: string) {
  const uuid = await getSessionUuid();
  if (!uuid) return;

  const associations = await getAssociations(uuid);

  for (const assoc of associations) {
    if (assoc.did === did) {
      if (!assoc.isPrimary) {
        await updateAssociation(uuid, assoc.did, { isPrimary: true });
      }
    } else if (assoc.isPrimary) {
      await updateAssociation(uuid, assoc.did, { isPrimary: false });
    }
  }

  await refreshSession();
}

export async function refreshAssociation(did: string) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") || "anonymous";
  const limit = process.env.E2E_TEST === "true" ? 100 : 15;
  if (isRateLimited(`action:refresh:${ip}`, limit, 60000)) {
    console.warn(`[ServerAction:refreshAssociation] Rate limited for IP: ${ip}`);
    return;
  }

  const uuid = await getSessionUuid();
  if (!uuid) return;

  const result = await resolveIdentity(did);
  if (result && result.handle && result.pdsUrl) {
    await updateAssociation(uuid, did, {
      handle: result.handle,
      pdsUrl: result.pdsUrl,
    });
    revalidatePath('/[locale]', 'page');
  }

  await refreshSession();
}

export async function removeAssociation(did: string) {
  const uuid = await getSessionUuid();
  if (!uuid) return;

  await deleteAssociation(uuid, did);
  revalidatePath('/[locale]', 'page');
  await refreshSession();
}

export async function moveAssociation(did: string, direction: 'up' | 'down') {
  const uuid = await getSessionUuid();
  if (!uuid) return;

  const associations = await getAssociations(uuid);
  const index = associations.findIndex(a => a.did === did);
  if (index === -1) return;

  if (direction === 'up' && index > 0) {
    const prev = associations[index - 1];
    const curr = associations[index];
    const prevOrder = prev.sortOrder ?? index - 1;
    const currOrder = curr.sortOrder ?? index;

    await updateAssociation(uuid, curr.did, { sortOrder: prevOrder });
    await updateAssociation(uuid, prev.did, { sortOrder: currOrder });
  } else if (direction === 'down' && index < associations.length - 1) {
    const next = associations[index + 1];
    const curr = associations[index];
    const nextOrder = next.sortOrder ?? index + 1;
    const currOrder = curr.sortOrder ?? index;

    await updateAssociation(uuid, curr.did, { sortOrder: nextOrder });
    await updateAssociation(uuid, next.did, { sortOrder: currOrder });
  }

  revalidatePath('/[locale]', 'page');
  await refreshSession();
}

export async function syncWithToken(token: string): Promise<{ success: boolean; error?: string }> {
  // IPベースのレート制限 (1分間に10回まで)
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") || "anonymous";
  const limit = process.env.E2E_TEST === "true" ? 100 : 15;
  if (isRateLimited(`action:sync:${ip}`, limit, 60000)) {
    return { success: false, error: "Too many requests. Please try again later." };
  }

  const targetUuid = await getUuidByShareToken(token);

  if (!targetUuid) {
    return { success: false, error: 'invalid_token' };
  }

  const sessionToken = await createSessionToken(targetUuid);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  await refreshSession();
  return { success: true };
}

export async function initializeSession() {
  // IPベースのレート制限 (1分間に10回まで)
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") || "anonymous";
  const limit = process.env.E2E_TEST === "true" ? 100 : 15;
  if (isRateLimited(`action:init:${ip}`, limit, 60000)) {
    console.warn(`[ServerAction:initializeSession] Rate limited for IP: ${ip}`);
    return;
  }

  const uuid = await getSessionUuid();
  if (uuid) return;

  let newUuid = crypto.randomUUID();
  let attempts = 0;
  
  while (attempts < 5) {
    const associations = await getAssociations(newUuid);
    if (associations.length === 0) break;
    newUuid = crypto.randomUUID();
    attempts++;
  }

  const sessionToken = await createSessionToken(newUuid);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  await refreshSession();
}

/**
 * DID から現在の検証ステータスを取得します。
 */
export async function getVerificationStatus(did: string) {
  const identity = await resolveIdentity(did);
  if (!identity || !identity.handle) return null;

  return await getVerifiedDomainFromDb(identity.handle);
}

/**
 * DID に紐づく認証済みドメインをすべて取得します。
 */
export async function getVerifiedDomains(did: string): Promise<VerifiedDomain[]> {
  return await getVerifiedDomainsByDid(did);
}
