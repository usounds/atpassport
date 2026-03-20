'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUuid } from './session';
import { getAssociations, updateAssociation, deleteAssociation, addAssociation, IdentityAssociation } from './models';
import { resolveIdentity } from './atproto';

export async function registerHandle(handle: string) {
  const uuid = await getSessionUuid();
  console.log(`[ServerAction:registerHandle] START uuid=${uuid}, handle=${handle}`);

  if (!uuid) {
    console.error('[ServerAction:registerHandle] ERROR: No UUID found in session');
    throw new Error("No session found");
  }

  const result = await resolveIdentity(handle);
  console.log(`[ServerAction:registerHandle] RESOLVED result=${JSON.stringify(result)}`);

  if (!result || !result.did || !result.pdsUrl) {
    console.error('[ServerAction:registerHandle] ERROR: Could not resolve handle to DID/PDS');
    throw new Error("Handle not found or missing PDS");
  }

  const { did, pdsUrl } = result;

  await addAssociation(uuid, did, handle, pdsUrl);
  console.log(`[ServerAction:registerHandle] SUCCESS: Added association with PDS URL`);
  revalidatePath('/[locale]', 'page');
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

  revalidatePath('/[locale]/picker', 'page');
}

export async function refreshAssociation(did: string) {
  const uuid = await getSessionUuid();
  if (!uuid) return;

  const associations = await getAssociations(uuid);
  const assoc = associations.find(a => a.did === did);
  if (!assoc) return;

  const result = await resolveIdentity(assoc.handle);
  if (result) {
    await updateAssociation(uuid, did, {
      did: result.did,
      pdsUrl: result.pdsUrl,
    });
    revalidatePath('/[locale]', 'page');
  }
}

export async function removeAssociation(did: string) {
  const uuid = await getSessionUuid();
  if (!uuid) return;

  await deleteAssociation(uuid, did);
  revalidatePath('/[locale]/picker', 'page');
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

  revalidatePath('/[locale]/picker', 'page');
}
