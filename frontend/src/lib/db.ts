import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let sessionTableName = "AtPassportSessions";
let shareTokensTableName = "AtPassportShareTokens";

try {
  const { Resource } = require("sst");
  if (Resource) {
    if (Resource.AtPassportSessions) {
      sessionTableName = Resource.AtPassportSessions.name;
    }
    if (Resource.AtPassportShareTokens) {
      shareTokensTableName = Resource.AtPassportShareTokens.name;
    }
  }
} catch (e) {
  // SST not found or not linked
  sessionTableName = process.env.DYNAMODB_TABLE_NAME || "AtPassportSessions";
  shareTokensTableName = process.env.DYNAMODB_SHARE_TOKENS_TABLE_NAME || "AtPassportShareTokens";
}

export const SESSION_TABLE_NAME = sessionTableName;
export const SHARE_TOKENS_TABLE_NAME = shareTokensTableName;

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.DYNAMODB_ENDPOINT
    ? { endpoint: process.env.DYNAMODB_ENDPOINT }
    : {}),
});

export const db = DynamoDBDocumentClient.from(client);
