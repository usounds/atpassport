import { db, SESSION_TABLE_NAME } from "./db";
import { PutCommand, QueryCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

export interface IdentityAssociation {
  uuid: string;
  did: string;
  handle: string;
  pdsUrl: string;
  createdAt: string;
  expiresAt?: number; // DynamoDB TTL (Unix timestamp)
  isPrimary?: boolean;
  sortOrder?: number;
}

const TTL_DURATION = 60 * 60 * 24 * 365; // 365 days

export async function addAssociation(uuid: string, did: string, handle: string, pdsUrl: string) {
  const associations = await getAssociations(uuid);
  const maxSortOrder = associations.reduce((max, curr) => Math.max(max, curr.sortOrder || 0), -1);

  const item: IdentityAssociation = {
    uuid,
    did,
    handle,
    pdsUrl,
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + TTL_DURATION,
    isPrimary: associations.length === 0, // Make primary if it's the first one
    sortOrder: maxSortOrder + 1,
  };

  await db.send(
    new PutCommand({
      TableName: SESSION_TABLE_NAME,
      Item: item,
    })
  );
  return item;
}

export async function touchSession(uuid: string) {
  const associations = await getAssociations(uuid);
  const newExpiresAt = Math.floor(Date.now() / 1000) + TTL_DURATION;

  for (const assoc of associations) {
    await updateAssociation(uuid, assoc.did, { expiresAt: newExpiresAt });
  }
}

export async function getAssociations(uuid: string): Promise<IdentityAssociation[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: SESSION_TABLE_NAME,
      KeyConditionExpression: "#uuid = :uuid",
      ExpressionAttributeNames: {
        "#uuid": "uuid",
      },
      ExpressionAttributeValues: {
        ":uuid": uuid,
      },
    })
  );

  const items = (result.Items as IdentityAssociation[]) || [];
  // Sort by sortOrder then createdAt
  return items.sort((a, b) => {
    if ((a.sortOrder ?? Infinity) !== (b.sortOrder ?? Infinity)) {
      return (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity);
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export async function updateAssociation(uuid: string, did: string, updates: Partial<IdentityAssociation>) {
  const result = await db.send(
    new GetCommand({
      TableName: SESSION_TABLE_NAME,
      Key: { uuid, did },
    })
  );

  const existing = result.Item as IdentityAssociation;
  if (!existing) return;

  const newItem = { ...existing, ...updates };

  await db.send(
    new PutCommand({
      TableName: SESSION_TABLE_NAME,
      Item: newItem,
    })
  );
}

export async function deleteAssociation(uuid: string, did: string) {
  await db.send(
    new DeleteCommand({
      TableName: SESSION_TABLE_NAME,
      Key: { uuid, did },
    })
  );
}
