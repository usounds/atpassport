import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// Attempt to get table name from SST or environment
let tableName = "AtPassportSessions";
try {
  const { Resource } = require("sst");
  if (Resource && Resource.AtPassportSessions) {
    tableName = Resource.AtPassportSessions.name;
  }
} catch (e) {
  // SST not found or not linked
  tableName = process.env.DYNAMODB_TABLE_NAME || "AtPassportSessions";
}

export const TABLE_NAME = tableName;

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.DYNAMODB_ENDPOINT
    ? { endpoint: process.env.DYNAMODB_ENDPOINT }
    : {}),
});

export const db = DynamoDBDocumentClient.from(client);
