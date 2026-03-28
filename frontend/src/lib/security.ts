import { db, VERIFIED_DOMAINS_TABLE_NAME } from "./db";
import { GetCommand, PutCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

export interface VerifiedDomain {
  domain: string;
  verifiedByDid: string;
  handle: string;
  status: 'approved';
  verifiedAt: string;
  isPublic?: string; // "true" or "false"
  method?: 'oauth' | 'file';
}

// List of domains that are explicitly banned
const BANNED_DOMAINS = [
  'evil.example.com',
  // Add more as reported
];

// List of infrastructure domains that should not be used to verify ownership
const INFRASTRUCTURE_DOMAINS = [
  'bsky.social',
  'bsky.network',
  'atproto.com',
  'bluesky.app',
];

/**
 * Checks if a domain is already verified in DynamoDB
 */
export async function getVerifiedDomainFromDb(domain: string): Promise<VerifiedDomain | null> {
  try {
    const response = (await db.send(new GetCommand({
      TableName: VERIFIED_DOMAINS_TABLE_NAME,
      Key: { domain: domain.toLowerCase() }
    }))) as { Item: VerifiedDomain };
    return response.Item || null;
  } catch (error) {
    console.error("Error fetching domain verification from DB:", error);
    return null;
  }
}

/**
 * Fetches all publicly listed verified domains
 */
export async function getPublicVerifiedDomains(): Promise<VerifiedDomain[]> {
  try {
    const response = (await db.send(new QueryCommand({
      TableName: VERIFIED_DOMAINS_TABLE_NAME,
      IndexName: "PublicVerifiedIndex",
      KeyConditionExpression: "isPublic = :true",
      ExpressionAttributeValues: {
        ":true": "true"
      },
      ScanIndexForward: false // Newest first
    }))) as { Items: VerifiedDomain[] };
    return response.Items || [];
  } catch (error) {
    console.error("Error fetching public verified domains:", error);
    return [];
  }
}

/**
 * Fetches all verified domains belonging to a specific DID
 */
export async function getVerifiedDomainsByDid(did: string): Promise<VerifiedDomain[]> {
  try {
    const response = (await db.send(new QueryCommand({
      TableName: VERIFIED_DOMAINS_TABLE_NAME,
      // IndexName: "VerifiedByDidIndex", // Note: This index should be added to SST config
      // Local stub uses KeyConditionExpression + ExpressionAttributeValues to filter in Memory
      KeyConditionExpression: "verifiedByDid = :did",
      ExpressionAttributeValues: {
        ":did": did
      },
      ScanIndexForward: false
    }))) as { Items: VerifiedDomain[] };
    return response.Items || [];
  } catch (error) {
    console.error("Error fetching verified domains by DID:", error);
    return [];
  }
}

/**
 * Marks a domain as verified in DynamoDB by a specific DID
 */
export async function verifyDomainInDb(
  domain: string, 
  did: string, 
  handle: string, 
  isPublic: boolean = true,
  method: 'oauth' | 'file' = 'oauth'
): Promise<void> {
  try {
    await db.send(new PutCommand({
      TableName: VERIFIED_DOMAINS_TABLE_NAME,
      Item: { 
        domain: domain.toLowerCase(),
        verifiedByDid: did,
        handle: handle,
        status: 'approved',
        isPublic: isPublic ? "true" : "false",
        verifiedAt: new Date().toISOString(),
        method: method
      }
    }));
  } catch (error) {
    console.error("Error verifying domain in DB:", error);
  }
}

/**
 * Removes a domain verification from DynamoDB
 */
export async function deleteVerifiedDomainFromDb(domain: string): Promise<void> {
  try {
    await db.send(new DeleteCommand({
      TableName: VERIFIED_DOMAINS_TABLE_NAME,
      Key: { domain: domain.toLowerCase() }
    }));
  } catch (error) {
    console.error("Error deleting domain verification from DB:", error);
  }
}

/**
 * Checks if a domain is verified by the list of handles the user owns.
 */
export function verifyDomain(domain: string, handles: string[]): { verified: boolean; reason?: 'banned' | 'unverified' | 'infrastructure' | 'localhost' | 'match' } {
  const lowerDomain = domain.toLowerCase();

  // 1. Check Blacklist
  if (BANNED_DOMAINS.includes(lowerDomain)) {
    return { verified: false, reason: 'banned' };
  }

  // 2. Allow localhost
  if (lowerDomain === 'localhost' || lowerDomain === '127.0.0.1' || lowerDomain.endsWith('.localhost')) {
    return { verified: true, reason: 'localhost' };
  }

  // 3. Match against current handles (immediate verification)
  for (const handle of handles.map(h => h.toLowerCase())) {
    // Skip infrastructure domains
    if (INFRASTRUCTURE_DOMAINS.some(infra => handle === infra || handle.endsWith('.' + infra))) {
      continue;
    }

    // Verify: exact match, or one is a subdomain of another
    // Handle "skyblur.uk" verifies "skyblur.uk" and "*.skyblur.uk"
    if (lowerDomain === handle || lowerDomain.endsWith('.' + handle)) {
      return { verified: true, reason: 'match' };
    }
  }

  return { verified: false, reason: 'unverified' };
}
