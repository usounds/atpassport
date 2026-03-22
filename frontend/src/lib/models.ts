import { db, SESSION_TABLE_NAME } from "./db";
import { PutCommand, QueryCommand, DeleteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

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

  // Parallelize updates for better performance
  await Promise.all(
    associations.map((assoc) => 
      updateAssociation(uuid, assoc.did, { expiresAt: newExpiresAt })
    )
  );
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
  const entries = Object.entries(updates);
  if (entries.length === 0) return;

  const updateExpressionParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  entries.forEach(([key, value], index) => {
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
