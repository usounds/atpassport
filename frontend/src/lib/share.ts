import { db, SHARE_TOKENS_TABLE_NAME } from "./db";
import { PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

export interface ShareTokenRecord {
  token: string;
  targetUuid: string;
  expiresAt: number;
}

/**
 * Creates a short-lived (10 minutes) share token for the given UUID.
 */
export async function createShareToken(targetUuid: string): Promise<string> {
  const token = uuidv4();
  const expiresAt = Math.floor(Date.now() / 1000) + 300; // 5 minutes

  await db.send(
    new PutCommand({
      TableName: SHARE_TOKENS_TABLE_NAME,
      Item: {
        token,
        targetUuid,
        expiresAt,
      },
    })
  );

  return token;
}

/**
 * Retrieves the target UUID associated with a share token.
 * Returns null if the token is invalid or expired.
 */
export async function getUuidByShareToken(token: string): Promise<string | null> {
  const result = await db.send(
    new GetCommand({
      TableName: SHARE_TOKENS_TABLE_NAME,
      Key: { token },
    })
  );

  const item = result.Item as ShareTokenRecord;
  if (!item) return null;

  // Verify expiration (DynamoDB TTL might not have deleted it yet)
  if (item.expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return item.targetUuid;
}

/**
 * Deletes a share token.
 */
export async function deleteShareToken(token: string): Promise<void> {
  await db.send(
    new DeleteCommand({
      TableName: SHARE_TOKENS_TABLE_NAME,
      Key: { token },
    })
  );
}
