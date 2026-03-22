import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, SESSION_TABLE_NAME } from '../db';
import { PutCommand, GetCommand, DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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
    }));
    expect(getResult.Item).toEqual(expect.objectContaining(mockItem));

    // Query
    const queryResult = await db.send(new QueryCommand({
      TableName: SESSION_TABLE_NAME,
      ExpressionAttributeValues: { ':uuid': 'u1' }
    }));
    expect(queryResult.Items).toHaveLength(1);
    expect(queryResult.Items[0].handle).toBe('h1');

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
    }));
    expect(updated.Item.handle).toBe('new-h');

    // Delete
    await db.send(new DeleteCommand({
      TableName: SESSION_TABLE_NAME,
      Key: { uuid: 'u1', did: 'd1' }
    }));
    
    const deleted = await db.send(new GetCommand({
      TableName: SESSION_TABLE_NAME,
      Key: { uuid: 'u1', did: 'd1' }
    }));
    expect(deleted.Item).toBeUndefined();
  });
});
