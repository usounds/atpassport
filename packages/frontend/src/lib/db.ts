import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  DeleteCommand, 
  QueryCommand, 
  UpdateCommand,
  PutCommandInput,
  GetCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  UpdateCommandInput
} from "@aws-sdk/lib-dynamodb";

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

export const VERIFIED_DOMAINS_TABLE_NAME =
  process.env.VERIFIED_DOMAINS_TABLE_NAME ||
  (typeof Resource !== "undefined" && "AtPassportVerifiedDomains" in Resource
    ? Resource.AtPassportVerifiedDomains.name
    : "AtPassportVerifiedDomains");

export const PASSKEYS_TABLE_NAME =
  process.env.PASSKEYS_TABLE_NAME ||
  (typeof Resource !== "undefined" && "AtPassportPasskeys" in Resource
    ? Resource.AtPassportPasskeys.name
    : "AtPassportPasskeys");

// --- Database Stub Implementation ---
// Next.js のホットリロード間でデータを保持するために global を使用
const globalForDb = globalThis as unknown as {
  memoryTables: Record<string, Record<string, unknown>[]>;
};

if (!globalForDb.memoryTables) {
  globalForDb.memoryTables = {
    [SESSION_TABLE_NAME]: [],
    [SHARE_TOKENS_TABLE_NAME]: [],
    [VERIFIED_DOMAINS_TABLE_NAME]: [],
    [PASSKEYS_TABLE_NAME]: [],
  };
}

const memoryTables = globalForDb.memoryTables;

/**
 * DynamoDB Client Stub
 * AWS に接続できない場合にインメモリで動作をシミュレートします
 */
type StubCommand = PutCommand | GetCommand | DeleteCommand | QueryCommand | UpdateCommand;

async function handleStubCommand(command: StubCommand) {
  const tableName = (command.input as { TableName?: string }).TableName;
  if (!tableName) return { Items: [], Item: null };

  const table = memoryTables[tableName] || (memoryTables[tableName] = []);

  if (command instanceof PutCommand) {
    const input = command.input as PutCommandInput;
    if (!input.Item) return {};
    const itemToPut = input.Item;
    // 重複チェック用のキーを特定
    const keyFields = ["uuid", "did", "token", "domain", "credentialID"];
    const existingIdx = table.findIndex(item => 
      keyFields.filter(k => itemToPut[k]).every(k => item[k] === itemToPut[k])
    );
    if (existingIdx >= 0) table[existingIdx] = { ...table[existingIdx], ...itemToPut };
    else table.push(itemToPut);
    return {};
  }

  if (command instanceof GetCommand) {
    const input = command.input as GetCommandInput;
    if (!input.Key) return { Item: null };
    const keyToGet = input.Key;
    const item = table.find(item => 
      Object.keys(keyToGet).every(k => item[k] === keyToGet[k])
    );
    return { Item: item };
  }

  if (command instanceof DeleteCommand) {
    const input = command.input as DeleteCommandInput;
    if (!input.Key) return {};
    const keyToDelete = input.Key;
    const idx = table.findIndex(item => 
      Object.keys(keyToDelete).every(k => item[k] === keyToDelete[k])
    );
    if (idx >= 0) table.splice(idx, 1);
    return {};
  }

  if (command instanceof QueryCommand) {
    const input = command.input as QueryCommandInput;
    const values = input.ExpressionAttributeValues || {};
    let items = [...table];

    // uuid 条件
    if (values[":uuid"]) {
      items = items.filter(item => item.uuid === values[":uuid"]);
    }
    // isPublic 条件 (DirectoryPage 用)
    if (values[":true"]) {
      items = items.filter(item => item.isPublic === values[":true"]);
    }
    // DID 条件 (getVerificationStatus 用の代わりなどの簡易実装)
    if (values[":did"]) {
      items = items.filter(item => item.did === values[":did"] || item.verifiedByDid === values[":did"]);
    }
    if (values[":verifiedByDid"]) {
      items = items.filter(item => item.verifiedByDid === values[":verifiedByDid"]);
    }

    // verifiedAt によるソート (ScanIndexForward: false のシミュレーション)
    if (input.ScanIndexForward === false) {
      items.sort((a, b) => {
        const valA = (a as { verifiedAt?: string }).verifiedAt || '';
        const valB = (b as { verifiedAt?: string }).verifiedAt || '';
        return valB.localeCompare(valA);
      });
    }

    return { Items: items };
  }

  if (command instanceof UpdateCommand) {
    const input = command.input as UpdateCommandInput;
    const { Key, ExpressionAttributeValues, ExpressionAttributeNames } = input;
    if (!Key) return {};
    const item = table.find(item => 
      Object.keys(Key).every(k => item[k] === Key[k])
    );
    if (item && ExpressionAttributeNames && ExpressionAttributeValues) {
      const setMatch = input.UpdateExpression?.match(/SET (.*)/);
      if (setMatch) {
        const assignments = setMatch[1].split(", ");
        assignments.forEach((assign: string) => {
          const parts = assign.split(" = ");
          if (parts.length === 2) {
            const actualName = ExpressionAttributeNames[parts[0]] || parts[0].replace('#', '');
            const actualVal = ExpressionAttributeValues[parts[1]];
            (item as Record<string, unknown>)[actualName] = actualVal;
          }
        });
      }
    }
    return {};
  }

  return { Items: [], Item: null };
}

const createStub = (originalClient: DynamoDBDocumentClient) => {
  return {
    send: async <T>(command: StubCommand): Promise<T> => {
      const isLocalDev = process.env.NODE_ENV === "development" && !process.env.USE_AWS_REAL_DB;

      if (!isLocalDev) {
        // In production, never fall back to stub to prevent data leaking between users
        return await (originalClient as { send: (cmd: unknown) => Promise<T> }).send(command);
      }

      try {
        if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) {
           throw { name: "CredentialsError" };
        }
        return await (originalClient as { send: (cmd: unknown) => Promise<T> }).send(command);
      } catch (e: unknown) {
        const error = e as { name?: string; code?: string; __type?: string };
        const errorName = error.name || error.code || error.__type || "";
        const isResourceError = 
          errorName.includes("ResourceNotFound") || 
          errorName.includes("CredentialsError") || 
          errorName.includes("NoCredentials") ||
          errorName.includes("AccessDenied") ||
          errorName.includes("ValidationException") ||
          errorName.includes("UnrecognizedClientException");
        
        if (isLocalDev && isResourceError) {
          console.warn(`⚠️ [DynamoDB Stub] Falling back to memory for command: ${command.constructor.name}`);
          return handleStubCommand(command) as unknown as T;
        }
        throw e;
      }
    },
  };
};

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
});

const realDocClient = DynamoDBDocumentClient.from(client);

export const db = createStub(realDocClient);
