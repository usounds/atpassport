import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  addAssociation, 
  getAssociations, 
  updateAssociation, 
  deleteAssociation, 
  touchSession,
  type IdentityAssociation 
} from '../models';
import { db } from '../db';
import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// Mock DynamoDB client
vi.mock('../db', () => ({
  db: {
    send: vi.fn(),
  },
  SESSION_TABLE_NAME: 'test-table',
}));

describe('Models Library (IdentityAssociation)', () => {
  const mockUuid = 'test-uuid';
  const mockDid = 'did:plc:123';
  const mockHandle = 'test.bsky.social';
  const mockPds = 'https://pds.example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAssociations', () => {
    it('should return sorted associations', async () => {
      const mockItems = [
        { uuid: mockUuid, did: 'did:1', handle: 'h1.test' as any, sortOrder: 1, createdAt: '2024-01-01T00:00:00Z' },
        { uuid: mockUuid, did: 'did:2', handle: 'h2.test' as any, sortOrder: 0, createdAt: '2024-01-02T00:00:00Z' },
      ];
      vi.mocked(db.send).mockResolvedValue({ Items: mockItems });

      const result = await getAssociations(mockUuid);

      expect(result).toHaveLength(2);
      expect(result[0].handle).toBe('h2.test'); // sortOrder 0 comes first
      expect(result[1].handle).toBe('h1.test'); // sortOrder 1 comes second
      expect(db.send).toHaveBeenCalledWith(expect.any(QueryCommand));
    });

    it('should sort items by createdAt if sortOrder is identical or missing', async () => {
      const mockItems = [
        { uuid: mockUuid, did: 'did:1', handle: 'h1.test' as any, createdAt: '2024-01-02T00:00:00Z' },
        { uuid: mockUuid, did: 'did:2', handle: 'h2.test' as any, sortOrder: 0, createdAt: '2024-01-01T00:00:00Z' },
        { uuid: mockUuid, did: 'did:3', handle: 'h3.test' as any, createdAt: '2024-01-03T00:00:00Z' },
      ];
      vi.mocked(db.send).mockResolvedValue({ Items: mockItems });

      const result = await getAssociations(mockUuid);

      expect(result).toHaveLength(3);
      expect(result[0].handle).toBe('h2.test'); // sortOrder 0
      expect(result[1].handle).toBe('h1.test'); // sortOrder missing (Infinity), then createdAt
      expect(result[2].handle).toBe('h3.test'); // sortOrder missing (Infinity), then createdAt
    });

    it('should return empty array if no items found', async () => {
      vi.mocked(db.send).mockResolvedValue({ Items: [] });
      const result = await getAssociations(mockUuid);
      expect(result).toEqual([]);
    });
  });

  describe('addAssociation', () => {
    it('should add a new association and make it primary if it is the first one', async () => {
      vi.mocked(db.send).mockResolvedValueOnce({ Items: [] }); // For initial getAssociations call
      vi.mocked(db.send).mockResolvedValueOnce({}); // For PutCommand

      const result = await addAssociation(mockUuid, mockDid, mockHandle as any, mockPds);

      expect(result.uuid).toBe(mockUuid);
      expect(result.isPrimary).toBe(true);
      expect(result.sortOrder).toBe(0);
      expect(db.send).toHaveBeenCalledWith(expect.any(PutCommand));
    });

    it('should not make primary if not the first one and calculate sortOrder correctly', async () => {
      const existingItems = [
        { uuid: mockUuid, did: 'did:1', handle: 'h1', sortOrder: 5 },
        { uuid: mockUuid, did: 'did:2', handle: 'h2' }, // sortOrder missing, should use 0
      ];
      vi.mocked(db.send).mockResolvedValueOnce({ Items: existingItems });
      vi.mocked(db.send).mockResolvedValueOnce({});

      const result = await addAssociation(mockUuid, 'did:new', 'new.h' as any, 'pds');

      expect(result.isPrimary).toBe(false);
      expect(result.sortOrder).toBe(6); // max(5, 0) + 1
    });
  });

  describe('updateAssociation', () => {
    it('should call UpdateCommand with correct parameters', async () => {
      vi.mocked(db.send).mockResolvedValue({});
      await updateAssociation(mockUuid, mockDid, { handle: 'new.handle' as any });
      expect(db.send).toHaveBeenCalledWith(expect.any(UpdateCommand));
    });

    it('should not call UpdateCommand if no valid fields provided', async () => {
      await updateAssociation(mockUuid, mockDid, { uuid: 'new-uuid' } as Partial<IdentityAssociation>);
      expect(db.send).not.toHaveBeenCalled();
    });
  });

  describe('touchSession', () => {
    it('should update expiresAt for all associations', async () => {
      const mockItems = [
        { uuid: mockUuid, did: 'did:1', handle: 'h1' },
        { uuid: mockUuid, did: 'did:2', handle: 'h2' },
      ];
      vi.mocked(db.send).mockResolvedValueOnce({ Items: mockItems });
      vi.mocked(db.send).mockResolvedValue({}); // For updates

      await touchSession(mockUuid);

      expect(db.send).toHaveBeenCalledWith(expect.any(QueryCommand));
      // Two updates should be called
      const updateCalls = vi.mocked(db.send).mock.calls.filter(call => call[0] instanceof UpdateCommand);
      expect(updateCalls).toHaveLength(2);
    });

    it('should handle touchSession with no associations', async () => {
      vi.mocked(db.send).mockResolvedValueOnce({ Items: [] });
      await touchSession(mockUuid);
      const updateCalls = vi.mocked(db.send).mock.calls.filter(call => call[0] instanceof UpdateCommand);
      expect(updateCalls).toHaveLength(0);
    });
  });

  describe('deleteAssociation', () => {
    it('should call DeleteCommand', async () => {
      vi.mocked(db.send).mockResolvedValue({});
      await deleteAssociation(mockUuid, mockDid);
      expect(db.send).toHaveBeenCalledWith(expect.any(DeleteCommand));
    });
  });
});
