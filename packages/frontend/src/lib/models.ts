import { db, SESSION_TABLE_NAME, PASSKEYS_TABLE_NAME } from "./db";
import { PutCommand, QueryCommand, DeleteCommand, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { type AppBskyActorDefs } from "@atcute/bluesky";
import type { Handle } from "@atcute/lexicons/syntax";

export interface IdentityAssociation {
  uuid: string;
  did: string;
  handle: Handle;
  pdsUrl: string;
  createdAt: string;
  expiresAt?: number; // DynamoDB TTL (Unix timestamp)
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface PasskeyDevice {
  credentialID: string; // Base64URL
  publicKey: string; // Base64URL
  counter: number;
  transports?: string[]; // JSON stringified array or actual array if handled by library
  uuid: string; // The AtPassport session UUID this passkey belongs to
  createdAt: string;
}

export async function addPasskey(passkey: PasskeyDevice) {
  await db.send(
    new PutCommand({
      TableName: PASSKEYS_TABLE_NAME,
      Item: passkey,
    })
  );
}

export async function getPasskey(credentialID: string): Promise<PasskeyDevice | null> {
  const result = (await db.send(
    new GetCommand({
      TableName: PASSKEYS_TABLE_NAME,
      Key: { credentialID },
    })
  )) as { Item: PasskeyDevice };
  return result.Item || null;
}

export async function getPasskeysByUuid(uuid: string): Promise<PasskeyDevice[]> {
  const result = (await db.send(
    new QueryCommand({
      TableName: PASSKEYS_TABLE_NAME,
      IndexName: "UuidIndex",
      KeyConditionExpression: "#uuid = :uuid",
      ExpressionAttributeNames: {
        "#uuid": "uuid",
      },
      ExpressionAttributeValues: {
        ":uuid": uuid,
      },
    })
  )) as { Items: PasskeyDevice[] };
  return result.Items || [];
}

export async function updatePasskeyCounter(credentialID: string, newCounter: number) {
  await db.send(
    new UpdateCommand({
      TableName: PASSKEYS_TABLE_NAME,
      Key: { credentialID },
      UpdateExpression: "SET #counter = :counter",
      ExpressionAttributeNames: {
        "#counter": "counter",
      },
      ExpressionAttributeValues: {
        ":counter": newCounter,
      },
    })
  );
}

export type AssociationWithProfile = IdentityAssociation & {
  profile?: AppBskyActorDefs.ProfileViewDetailed | null;
};

const TTL_DURATION = 60 * 60 * 24 * 365; // 365 days

export async function addAssociation(uuid: string, did: string, handle: Handle, pdsUrl: string) {
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

  // Parallelize updates for better performance
  await Promise.all(
    associations.map((assoc) => 
      updateAssociation(uuid, assoc.did, { expiresAt: newExpiresAt })
    )
  );
}

export async function getAssociations(uuid: string): Promise<IdentityAssociation[]> {
  const result = (await db.send(
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
  )) as { Items: IdentityAssociation[] };

  const items = result.Items || [];
  // Sort by sortOrder then createdAt
  return items.sort((a, b) => {
    if ((a.sortOrder ?? Infinity) !== (b.sortOrder ?? Infinity)) {
      return (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity);
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export async function updateAssociation(uuid: string, did: string, updates: Partial<IdentityAssociation>) {
  const filteredEntries = Object.entries(updates).filter(([key]) => key !== "uuid" && key !== "did");
  if (filteredEntries.length === 0) return;

  const updateExpressionParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  filteredEntries.forEach(([key, value], index) => {
    const attrName = `#attr${index}`;
    const attrVal = `:val${index}`;
    updateExpressionParts.push(`${attrName} = ${attrVal}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrVal] = value;
  });

  await db.send(
    new UpdateCommand({
      TableName: SESSION_TABLE_NAME,
      Key: { uuid, did },
      UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
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
