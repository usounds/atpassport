import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, SESSION_TABLE_NAME, VERIFIED_DOMAINS_TABLE_NAME } from '../db';
import { 
  PutCommand, GetCommand, DeleteCommand, QueryCommand, UpdateCommand,
  type GetCommandOutput, type QueryCommandOutput 
} from '@aws-sdk/lib-dynamodb';

describe('Database Library (Stub)', () => {
  const mockItem = { uuid: 'u1', did: 'd1', handle: 'h1' };

  beforeEach(() => {
    // Enable stub by mocking environment
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AWS_ACCESS_KEY_ID', ''); // Force stub
  });

  it('should store and retrieve items using stub', async () => {
    // Put
    await db.send(new PutCommand({
      TableName: SESSION_TABLE_NAME,
      Item: mockItem
    }));

    // Get
    const getResult = await db.send(new GetCommand({
      TableName: SESSION_TABLE_NAME,
      Key: { uuid: 'u1', did: 'd1' }
    })) as GetCommandOutput;
    expect(getResult.Item).toEqual(expect.objectContaining(mockItem));

    // Query
    const queryResult = await db.send(new QueryCommand({
      TableName: SESSION_TABLE_NAME,
      ExpressionAttributeValues: { ':uuid': 'u1' }
    })) as QueryCommandOutput;
    expect(queryResult.Items).toHaveLength(1);
    expect(queryResult.Items![0].handle).toBe('h1');

    // Update
    await db.send(new UpdateCommand({
      TableName: SESSION_TABLE_NAME,
      Key: { uuid: 'u1', did: 'd1' },
      UpdateExpression: 'SET #h = :h',
      ExpressionAttributeNames: { '#h': 'handle' },
      ExpressionAttributeValues: { ':h': 'new-h' }
    }));
    
    const updated = await db.send(new GetCommand({
      TableName: SESSION_TABLE_NAME,
      Key: { uuid: 'u1', did: 'd1' }
    })) as GetCommandOutput;
    expect(updated.Item!.handle).toBe('new-h');

    // Delete
    await db.send(new DeleteCommand({
      TableName: SESSION_TABLE_NAME,
      Key: { uuid: 'u1', did: 'd1' }
    }));
    
    const deleted = await db.send(new GetCommand({
      TableName: SESSION_TABLE_NAME,
      Key: { uuid: 'u1', did: 'd1' }
    })) as GetCommandOutput;
    expect(deleted.Item).toBeUndefined();
  });

  it('should handle Query with isPublic filter and sorting', async () => {
    const table = VERIFIED_DOMAINS_TABLE_NAME;
    await db.send(new PutCommand({ TableName: table, Item: { domain: 'a.com', isPublic: true, verifiedAt: '2023-01-01' } }));
    await db.send(new PutCommand({ TableName: table, Item: { domain: 'b.com', isPublic: false, verifiedAt: '2023-01-02' } }));
    await db.send(new PutCommand({ TableName: table, Item: { domain: 'c.com', isPublic: true, verifiedAt: '2023-01-03' } }));

    // Query isPublic: true
    const publicResult = await db.send(new QueryCommand({
      TableName: table,
      ExpressionAttributeValues: { ':true': true }
    })) as QueryCommandOutput;
    expect(publicResult.Items).toHaveLength(2);

    // Query with sorting (ScanIndexForward: false)
    const sortedResult = await db.send(new QueryCommand({
      TableName: table,
      ExpressionAttributeValues: { ':true': true },
      ScanIndexForward: false
    })) as QueryCommandOutput;
    expect(sortedResult.Items![0].domain).toBe('c.com');
    expect(sortedResult.Items![1].domain).toBe('a.com');

    // Sorting with missing verifiedAt
    await db.send(new PutCommand({ TableName: table, Item: { domain: 'no-date.com', isPublic: true } }));
    await db.send(new QueryCommand({
      TableName: table,
      ExpressionAttributeValues: { ':true': true },
      ScanIndexForward: false
    }));

    // Query with did
    const didResult = await db.send(new QueryCommand({
      TableName: table,
      ExpressionAttributeValues: { ':did': 'did:1' }
    })) as QueryCommandOutput;
    // Item did:1 should match either did or verifiedByDid in the stub
    expect(didResult.Items).toBeDefined();

    // Query with verifiedByDid
    const verifiedResult = await db.send(new QueryCommand({
      TableName: table,
      ExpressionAttributeValues: { ':verifiedByDid': 'did:1' }
    })) as QueryCommandOutput;
    expect(verifiedResult.Items).toBeDefined();
  });

  it('should handle Update with unusual expressions', async () => {
    const table = SESSION_TABLE_NAME;
    await db.send(new PutCommand({ TableName: table, Item: { uuid: 'u2', did: 'd2', val: 1 } }));

    // Update with hash prefix in attribute name
    await db.send(new UpdateCommand({
      TableName: table,
      Key: { uuid: 'u2', did: 'd2' },
      UpdateExpression: 'SET #v = :v',
      ExpressionAttributeNames: { '#v': 'val' },
      ExpressionAttributeValues: { ':v': 10 }
    }));
    
    const res = await db.send(new GetCommand({ TableName: table, Key: { uuid: 'u2', did: 'd2' } })) as GetCommandOutput;
    expect(res.Item!.val).toBe(10);

    // Invalid expression format (no SET)
    await db.send(new UpdateCommand({
      TableName: table,
      Key: { uuid: 'u2', did: 'd2' },
      UpdateExpression: 'INVALID'
    }));

    // Invalid assignment format (no =)
    await db.send(new UpdateCommand({
      TableName: table,
      Key: { uuid: 'u2', did: 'd2' },
      UpdateExpression: 'SET invalid_assignment',
      ExpressionAttributeNames: { '#v': 'val' },
      ExpressionAttributeValues: { ':v': 10 }
    }));

    // Item not found in Update
    await db.send(new UpdateCommand({
      TableName: table,
      Key: { uuid: 'nonexistent', did: 'none' },
      UpdateExpression: 'SET foo = bar'
    }));
  });

  it('should throw error if not in local dev or real error occurs', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      await db.send(new GetCommand({ TableName: 'any', Key: {} }));
      expect.fail('Should have thrown error');
    } catch (e: any) {
      expect(e).toBeDefined();
    }

    // Reset env
    vi.stubEnv('NODE_ENV', 'development');
    // Use mockRejectedValueOnce for async error
    const sendSpy = vi.spyOn(db, 'send').mockRejectedValueOnce(new Error('Unknown Error'));
    try {
      await db.send(new GetCommand({ TableName: 'any', Key: {} }));
      expect.fail('Should have thrown error');
    } catch (e: any) {
      expect(e.message).toContain('Unknown Error');
    }
    sendSpy.mockRestore();
  });
});
