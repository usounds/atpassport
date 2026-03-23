import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerHandle, setPrimaryAssociation, removeAssociation, moveAssociation, syncWithToken, refreshAssociation, initializeSession } from '../actions';
import { getSessionUuid, createSessionToken, SESSION_COOKIE_NAME } from '../session';
import { getAssociations, addAssociation, updateAssociation, deleteAssociation } from '../models';
import { resolveIdentity } from '../atproto-server';
import { getUuidByShareToken } from '../share';
import { revalidatePath } from 'next/cache';
import { cookies, headers } from 'next/headers';

vi.mock('../session');
vi.mock('../models');
vi.mock('../atproto-server');
vi.mock('../share');
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

describe('Actions Library', () => {
  const mockUuid = 'test-uuid';
  const mockHandle = 'test.bsky.social';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for headers
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue('127.0.0.1')
    } as any);
  });

  describe('registerHandle', () => {
    it('should register a new handle successfully', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(resolveIdentity).mockResolvedValue({ did: 'did:plc:new', handle: 'new.handle', pdsUrl: 'http://pds' });
      vi.mocked(getAssociations).mockResolvedValue([]);
      vi.mocked(addAssociation).mockResolvedValue({} as any);

      const result = await registerHandle(mockHandle);

      expect(result.success).toBe(true);
      expect(addAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:new', 'new.handle', 'http://pds');
    });

    it('should update metadata if DID already exists', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(resolveIdentity).mockResolvedValue({ did: 'did:plc:existing', handle: 'new.handle', pdsUrl: 'http://new-pds' });
      vi.mocked(getAssociations).mockResolvedValue([{ did: 'did:plc:existing', handle: 'old.handle' } as any]);

      const result = await registerHandle(mockHandle);

      expect(result.success).toBe(true);
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:existing', {
        handle: 'new.handle',
        pdsUrl: 'http://new-pds'
      });
      expect(addAssociation).not.toHaveBeenCalled();
    });
  });

  describe('setPrimaryAssociation', () => {
    it('should update primary status', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: 'did:plc:1', isPrimary: true } as any,
        { did: 'did:plc:2', isPrimary: false } as any,
      ]);

      await setPrimaryAssociation('did:plc:2');

      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:2', { isPrimary: true });
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:1', { isPrimary: false });
    });
  });

  describe('refreshAssociation', () => {
    it('should update PDS URL and handle on success', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(resolveIdentity).mockResolvedValue({ did: 'did:plc:1', handle: 'new.h1', pdsUrl: 'http://new-pds' });

      await refreshAssociation('did:plc:1');

      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:1', { 
        handle: 'new.h1', 
        pdsUrl: 'http://new-pds' 
      });
    });
  });

  describe('moveAssociation', () => {
    it('should swap sort orders when moving up', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: 'did:plc:1', sortOrder: 0 } as any,
        { did: 'did:plc:2', sortOrder: 1 } as any,
      ]);

      await moveAssociation('did:plc:2', 'up');

      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:2', { sortOrder: 0 });
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:1', { sortOrder: 1 });
    });

    it('should not move if already at the top', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([{ did: 'did:plc:1', sortOrder: 0 } as any]);

      await moveAssociation('did:plc:1', 'up');

      expect(updateAssociation).not.toHaveBeenCalled();
    });
  });

  describe('syncWithToken', () => {
    it('should set session cookie if token is valid', async () => {
      vi.mocked(getUuidByShareToken).mockResolvedValue('target-uuid');
      vi.mocked(createSessionToken).mockResolvedValue('session-token');
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ set: mockCookieSet } as any);

      const result = await syncWithToken('valid-token', 'en');

      expect(result.success).toBe(true);
      expect(mockCookieSet).toHaveBeenCalledWith(expect.any(String), 'session-token', expect.any(Object));
    });

    it('should return error if token is invalid', async () => {
      vi.mocked(getUuidByShareToken).mockResolvedValue(null);
      const result = await syncWithToken('invalid-token', 'en');
      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_token');
    });
  });

  describe('initializeSession', () => {
    it('should set a new session cookie if none exists', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      vi.mocked(getAssociations).mockResolvedValue([]);
      vi.mocked(createSessionToken).mockResolvedValue('new-token');
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn(), set: mockCookieSet } as any);

      await initializeSession();

      expect(mockCookieSet).toHaveBeenCalledWith(SESSION_COOKIE_NAME, 'new-token', expect.any(Object));
    });

    it('should not set a cookie if one already exists', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue('existing-uuid');
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ set: mockCookieSet } as any);

      await initializeSession();

      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it('should retry if UUID collision occurs', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      // First call returns existing, second returns empty (no collision)
      vi.mocked(getAssociations)
        .mockResolvedValueOnce([{ did: 'did:1' } as any])
        .mockResolvedValueOnce([]);
      vi.mocked(createSessionToken).mockResolvedValue('new-token');
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn(), set: mockCookieSet } as any);

      await initializeSession();

      expect(getAssociations).toHaveBeenCalledTimes(2);
      expect(mockCookieSet).toHaveBeenCalled();
    });
  });
});
