'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUuid } from './session';
import { getAssociations, updateAssociation, deleteAssociation, addAssociation, IdentityAssociation } from './models';
import { resolveIdentity } from './atproto-server';
import { getUuidByShareToken, deleteShareToken } from './share';
import { createSessionToken, SESSION_COOKIE_NAME } from './session';
import { cookies } from 'next/headers';

export async function registerHandle(handle: string): Promise<{ success: boolean; error?: string }> {
  const uuid = await getSessionUuid();
  if (!uuid) return { success: false, error: "No session found" };

  const result = await resolveIdentity(handle);
  if (!result || !result.did || !result.pdsUrl || !result.handle) {
    return { success: false, error: "Handle not found or missing PDS" };
  }

  const { did, pdsUrl, handle: resolvedHandle } = result;
  const associations = await getAssociations(uuid);
  
  // DIDベースで既存の登録を確認
  const existing = associations.find(a => a.did === did);

  try {
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
    return { success: true };
  } catch (error: any) {
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

  // Removed revalidatePath for picker
}

export async function refreshAssociation(did: string) {
  const uuid = await getSessionUuid();
  if (!uuid) return;

  // DID をキーに最新のアイデンティティ情報を取得
  const result = await resolveIdentity(did);
  if (result && result.handle && result.pdsUrl) {
    await updateAssociation(uuid, did, {
      handle: result.handle,
      pdsUrl: result.pdsUrl,
    });
    revalidatePath('/[locale]', 'page');
  }
}

export async function removeAssociation(did: string) {
  const uuid = await getSessionUuid();
  if (!uuid) return;

  await deleteAssociation(uuid, did);
  // Removed revalidatePath for picker
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

  // Removed revalidatePath for picker
}

import { redirect } from 'next/navigation';

export async function syncWithToken(token: string, locale: string): Promise<{ success: boolean; error?: string }> {
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


  return { success: true };
}
