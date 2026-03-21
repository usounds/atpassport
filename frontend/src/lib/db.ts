import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

import { Resource } from "sst";

export const SESSION_TABLE_NAME =
  process.env.DYNAMODB_TABLE_NAME ||
  (Resource && "AtPassportSessions" in Resource
    ? (Resource.AtPassportSessions as any).name
    : "AtPassportSessions");

export const SHARE_TOKENS_TABLE_NAME =
  process.env.SHARE_TOKENS_TABLE_NAME ||
  (Resource && "AtPassportShareTokens" in Resource
    ? (Resource.AtPassportShareTokens as any).name
    : "AtPassportShareTokens");

// --- Database Stub Implementation ---
// Next.js のホットリロード間でデータを保持するために global を使用
const globalForDb = globalThis as unknown as {
  memoryTables: Record<string, any[]>;
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
const createStub = (originalClient: any) => {
  return {
    send: async (command: any) => {
      // 開発中のみ Stub を許可（AWS の設定がない場合など）
      const isLocalDev = process.env.NODE_ENV === "development" && !process.env.USE_AWS_REAL_DB;

      if (!isLocalDev) {
        return originalClient.send(command);
      }

      try {
        // AWS_ACCESS_KEY_ID が存在しない場合は最初からスタブへ
        if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) {
           throw { name: "CredentialsError" };
        }
        return await originalClient.send(command);
      } catch (e: any) {
        // テーブル未発見、または認証エラー時にスタブへ切り替え
        const isResourceError = e.name === "ResourceNotFoundException" || e.name === "CredentialsError" || e.name === "NoCredentials";
        
        if (isLocalDev && isResourceError) {
          console.warn(`⚠️ [DynamoDB Stub] Falling back to memory for command: ${command.constructor.name}`);
          return handleStubCommand(command);
        }
        throw e;
      }
    },
  };
};

async function handleStubCommand(command: any) {
  const { input } = command;
  const tableName = input.TableName;
  const table = memoryTables[tableName] || (memoryTables[tableName] = []);

  // PutCommand
  if (command instanceof PutCommand) {
    const keys = ["uuid", "did", "token"];
    const existingIdx = table.findIndex((item: any) => 
      keys.every(k => !input.Item[k] || item[k] === input.Item[k])
    );
    if (existingIdx >= 0) table[existingIdx] = { ...table[existingIdx], ...input.Item };
    else table.push(input.Item);
    return {};
  }

  // GetCommand
  if (command instanceof GetCommand) {
    const item = table.find((item: any) => 
      Object.keys(input.Key).every(k => item[k] === input.Key[k])
    );
    return { Item: item };
  }

  // DeleteCommand
  if (command instanceof DeleteCommand) {
    const idx = table.findIndex((item: any) => 
      Object.keys(input.Key).every(k => item[k] === input.Key[k])
    );
    if (idx >= 0) table.splice(idx, 1);
    return {};
  }

  // QueryCommand (Simplified: handle 'uuid = :uuid')
  if (command instanceof QueryCommand) {
    const uuid = input.ExpressionAttributeValues?.[":uuid"];
    const items = table.filter((item: any) => !uuid || item.uuid === uuid);
    return { Items: items };
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
