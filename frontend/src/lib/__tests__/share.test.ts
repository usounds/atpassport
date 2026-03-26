import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createShareToken, getUuidByShareToken, deleteShareToken } from '../share';
import { db } from '../db';
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

vi.mock('../db', () => ({
  db: {
    send: vi.fn(),
  },
  SHARE_TOKENS_TABLE_NAME: 'share-tokens-table',
}));

describe('Share Library', () => {
  const mockUuid = 'target-uuid-123';
  const mockToken = 'mock-uuid-v4-token';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mock('uuid', () => ({
      v4: () => 'mock-uuid-v4-token',
    }));
  });

  describe('createShareToken', () => {
    it('should create a token and store it in DynamoDB', async () => {
      vi.mocked(db.send).mockResolvedValue({});
      
      const token = await createShareToken(mockUuid);
      
      expect(token).toBe(mockToken);
      expect(db.send).toHaveBeenCalledWith(expect.any(PutCommand));
    });
  });

  describe('getUuidByShareToken', () => {
    it('should return uuid for a valid, non-expired token', async () => {
      const now = Math.floor(Date.now() / 1000);
      vi.mocked(db.send).mockResolvedValue({
        Item: {
          token: mockToken,
          targetUuid: mockUuid,
          expiresAt: now + 300,
        },
      });

      const result = await getUuidByShareToken(mockToken);
      expect(result).toBe(mockUuid);
    });

    it('should return null for an expired token', async () => {
      const now = Math.floor(Date.now() / 1000);
      vi.mocked(db.send).mockResolvedValue({
        Item: {
          token: mockToken,
          targetUuid: mockUuid,
          expiresAt: now - 60, // Expired
        },
      });

      const result = await getUuidByShareToken(mockToken);
      expect(result).toBeNull();
    });

    it('should return null if token not found', async () => {
      vi.mocked(db.send).mockResolvedValue({ Item: null });
      const result = await getUuidByShareToken('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('deleteShareToken', () => {
    it('should call DeleteCommand', async () => {
      vi.mocked(db.send).mockResolvedValue({});
      await deleteShareToken(mockToken);
      expect(db.send).toHaveBeenCalledWith(expect.any(DeleteCommand));
    });
  });
});
