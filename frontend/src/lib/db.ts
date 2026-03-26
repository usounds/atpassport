import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { Resource } from "sst";

export const SESSION_TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME ||
  (typeof Resource !== "undefined" && "AtPassportSessions" in Resource
    ? Resource.AtPassportSessions.name
    : "AtPassportSessions");

export const SHARE_TOKENS_TABLE_NAME =
  process.env.SHARE_TOKENS_TABLE_NAME ||
  (typeof Resource !== "undefined" && "AtPassportShareTokens" in Resource
    ? Resource.AtPassportShareTokens.name
    : "AtPassportShareTokens");

// --- Database Stub Implementation ---
// Next.js のホットリロード間でデータを保持するために global を使用
const globalForDb = globalThis as unknown as {
  memoryTables: Record<string, Record<string, unknown>[]>;
};

if (!globalForDb.memoryTables) {
  globalForDb.memoryTables = {
    [SESSION_TABLE_NAME]: [],
    [SHARE_TOKENS_TABLE_NAME]: [],
  };
}

const memoryTables = globalForDb.memoryTables;

/**
 * DynamoDB Client Stub
 * AWS に接続できない場合にインメモリで動作をシミュレートします
 */
const createStub = (originalClient: DynamoDBDocumentClient) => {
  return {
    send: async <T>(command: { constructor: { name: string }; input: { TableName?: string; Item?: Record<string, unknown>; Key?: Record<string, unknown>; ExpressionAttributeValues?: Record<string, unknown>; ExpressionAttributeNames?: Record<string, string>; UpdateExpression?: string } }): Promise<T> => {
      // 開発中のみ Stub を許可（AWS の設定がない場合など）
      const isLocalDev = process.env.NODE_ENV === "development" && !process.env.USE_AWS_REAL_DB;

      if (!isLocalDev) {
        return originalClient.send(command as unknown as PutCommand) as Promise<T>;
      }

      try {
        // AWS_ACCESS_KEY_ID が存在しない場合は最初からスタブへ
        if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) {
           throw { name: "CredentialsError" };
        }
        return await (originalClient.send(command as unknown as PutCommand) as Promise<T>);
      } catch (e: unknown) {
        // テーブル未発見、または認証エラー時にスタブへ切り替え
        const error = e as { name?: string };
        const isResourceError = error.name === "ResourceNotFoundException" || error.name === "CredentialsError" || error.name === "NoCredentials";
        
        if (isLocalDev && isResourceError) {
          console.warn(`⚠️ [DynamoDB Stub] Falling back to memory for command: ${command.constructor.name}`);
          return handleStubCommand(command) as unknown as T;
        }
        throw e;
      }
    },
  };
};

async function handleStubCommand(command: { constructor: { name: string }; input: { TableName?: string; Item?: Record<string, unknown>; Key?: Record<string, unknown>; ExpressionAttributeValues?: Record<string, unknown>; ExpressionAttributeNames?: Record<string, string>; UpdateExpression?: string } }) {
  const { input } = command;
  const tableName = input.TableName;
  if (!tableName) return { Items: [], Item: null };

  const table = memoryTables[tableName] || (memoryTables[tableName] = []);

  // PutCommand
  if (command instanceof PutCommand) {
    if (!input.Item) return {};
    const itemToPut = input.Item;
    const keys = ["uuid", "did", "token"];
    const existingIdx = table.findIndex((item: Record<string, unknown>) => 
      keys.every(k => !itemToPut[k] || item[k] === itemToPut[k])
    );
    if (existingIdx >= 0) table[existingIdx] = { ...table[existingIdx], ...itemToPut };
    else table.push(itemToPut);
    return {};
  }

  // GetCommand
  if (command instanceof GetCommand) {
    if (!input.Key) return { Item: null };
    const keyToGet = input.Key;
    const item = table.find((item: Record<string, unknown>) => 
      Object.keys(keyToGet).every(k => item[k] === keyToGet[k])
    );
    return { Item: item };
  }

  // DeleteCommand
  if (command instanceof DeleteCommand) {
    if (!input.Key) return {};
    const keyToDelete = input.Key;
    const idx = table.findIndex((item: Record<string, unknown>) => 
      Object.keys(keyToDelete).every(k => item[k] === keyToDelete[k])
    );
    if (idx >= 0) table.splice(idx, 1);
    return {};
  }

  // QueryCommand (Simplified: handle 'uuid = :uuid')
  if (command instanceof QueryCommand) {
    const uuid = input.ExpressionAttributeValues?.[":uuid"];
    const items = table.filter((item: Record<string, unknown>) => !uuid || item.uuid === uuid);
    return { Items: items };
  }

  // UpdateCommand (Simplified: handle SET #attr = :val)
  if (command instanceof UpdateCommand) {
    const { Key, ExpressionAttributeValues, ExpressionAttributeNames } = input;
    if (!Key) return {};
    const item = table.find((item: Record<string, unknown>) => 
      Object.keys(Key).every(k => item[k] === Key[k])
    );
    if (item && ExpressionAttributeNames && ExpressionAttributeValues) {
      // Very simple parser for "SET #a = :v, #b = :v"
      const setMatch = input.UpdateExpression?.match(/SET (.*)/);
      if (setMatch) {
        const assignments = setMatch[1].split(", ");
        assignments.forEach((assign: string) => {
          const [placeholderName, placeholderVal] = assign.split(" = ");
          const actualName = ExpressionAttributeNames[placeholderName];
          const actualVal = ExpressionAttributeValues[placeholderVal];
          if (actualName) (item as Record<string, unknown>)[actualName] = actualVal;
        });
      }
    }
    return {};
  }

  return { Items: [], Item: null };
}

// --- Client Initialization ---
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
});

const realDocClient = DynamoDBDocumentClient.from(client);

// スタブで包んだクライアントをエクスポート
export const db = createStub(realDocClient);
