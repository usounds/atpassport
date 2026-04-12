import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  registerHandle, 
  moveAssociation, 
  syncWithToken, 
  refreshAssociation, 
  initializeSession,
  claimDomainOwnership,
  withdrawDomain,
  updateDomainSettings,
  removeAssociation,
  setPrimaryAssociation
} from '../actions';
import { getSessionUuid, createSessionToken, SESSION_COOKIE_NAME } from '../session';
import { getAssociations, addAssociation, updateAssociation, deleteAssociation, type AssociationWithProfile } from '../models';
import { resolveIdentity } from '../atproto-server';
import { getUuidByShareToken } from '../share';
import { cookies, headers } from 'next/headers';
import { isRateLimited } from '../rate-limit';
import { verifyDomainInDb, getVerifiedDomainFromDb, deleteVerifiedDomainFromDb } from '../security';
import { revalidatePath } from 'next/cache';

vi.mock('../session');
vi.mock('../models');
vi.mock('../atproto-server');
vi.mock('../share');
vi.mock('../rate-limit');
vi.mock('../security');
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

describe('Actions Library', () => {
  const mockUuid = 'test-uuid';
  const mockDid = 'did:plc:user123';
  const mockHandle = 'test.bsky.social';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for headers
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue('127.0.0.1')
    } as unknown as Headers);
    // Default mock for rate-limit
    vi.mocked(isRateLimited).mockReturnValue(false);
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('claimDomainOwnership', () => {
    it('should claim ownership if handle is in associations', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid, handle: 'user.com' } as unknown as AssociationWithProfile
      ]);
      vi.mocked(verifyDomainInDb).mockResolvedValue({} as any);

      const result = await claimDomainOwnership(mockDid);

      expect(result.success).toBe(true);
      expect(verifyDomainInDb).toHaveBeenCalledWith('user.com', mockDid, true, 'oauth');
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('should fail if handle is infrastructure domain', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid, handle: 'bsky.social' } as unknown as AssociationWithProfile
      ]);

      const result = await claimDomainOwnership(mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Infrastructure');
    });

    it('should fail if handle does not contain a dot', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid, handle: 'localhost' } as unknown as AssociationWithProfile
      ]);

      const result = await claimDomainOwnership(mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should fail if DID not found in associations', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([]);
      const result = await claimDomainOwnership(mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail if no session', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      const result = await claimDomainOwnership(mockDid);
      expect(result.success).toBe(false);
    });

    it('should fail if verifyDomainInDb throws error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid, handle: 'user.com' } as unknown as AssociationWithProfile
      ]);
      vi.mocked(verifyDomainInDb).mockRejectedValue(new Error('DB Error'));

      const result = await claimDomainOwnership(mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
      expect(console.error).toHaveBeenCalled();
    });
  });


  describe('withdrawDomain', () => {
    const domain = 'remove.me';

    it('should delete if user is owner', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid } as unknown as AssociationWithProfile
      ]);
      vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
        domain, verifiedByDid: mockDid, status: 'approved', verifiedAt: 't'
      });
      vi.mocked(deleteVerifiedDomainFromDb).mockResolvedValue({} as any);

      const result = await withdrawDomain(domain, mockDid);

      expect(result.success).toBe(true);
      expect(deleteVerifiedDomainFromDb).toHaveBeenCalledWith(domain);
    });

    it('should fail if no session', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      const result = await withdrawDomain(domain, mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No session found');
    });

    it('should fail if DID not associated', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([]);
      const result = await withdrawDomain(domain, mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toBe('DID not associated with your account');
    });

    it('should fail if user is not owner', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid } as unknown as AssociationWithProfile
      ]);
      vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
        domain, verifiedByDid: 'other', status: 'approved', verifiedAt: 't'
      });

      const result = await withdrawDomain(domain, mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized or domain not found');
    });

    it('should fail if domain not found', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid } as unknown as AssociationWithProfile
      ]);
      vi.mocked(getVerifiedDomainFromDb).mockResolvedValue(null);
      const result = await withdrawDomain(domain, mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized or domain not found');
    });

    it('should handle errors during withdrawal', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid } as unknown as AssociationWithProfile
      ]);
      vi.mocked(getVerifiedDomainFromDb).mockRejectedValue(new Error('DB Error'));
      const result = await withdrawDomain(domain, mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('updateDomainSettings', () => {
    it('should update isPublic setting', async () => {
      const domain = 'update.me';
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid } as unknown as AssociationWithProfile
      ]);
      vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
        domain, verifiedByDid: mockDid, status: 'approved', verifiedAt: 't', method: 'file'
      });
      vi.mocked(verifyDomainInDb).mockResolvedValue({} as any);

      const result = await updateDomainSettings(domain, mockDid, false);

      expect(result.success).toBe(true);
      expect(verifyDomainInDb).toHaveBeenCalledWith(domain, mockDid, false, 'file');
    });

    it('should fail if no session in updateDomainSettings', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      const result = await updateDomainSettings('d', mockDid, true);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No session found');
    });

    it('should fail if DID not associated in updateDomainSettings', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([]);
      const result = await updateDomainSettings('d', mockDid, true);
      expect(result.success).toBe(false);
      expect(result.error).toBe('DID not associated with your account');
    });

    it('should fail if unauthorized in updateDomainSettings', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid } as unknown as AssociationWithProfile
      ]);
      vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
        domain: 'd', verifiedByDid: 'other', status: 'approved', verifiedAt: 't'
      });
      const result = await updateDomainSettings('d', mockDid, true);
      expect(result.success).toBe(false);
    });

    it('should handle errors in updateDomainSettings', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid } as unknown as AssociationWithProfile
      ]);
      vi.mocked(getVerifiedDomainFromDb).mockRejectedValue(new Error('DB Error'));
      const result = await updateDomainSettings('d', mockDid, true);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('registerHandle', () => {
    it('should return rate limit error if exceeded', async () => {
      vi.mocked(isRateLimited).mockReturnValue(true);
      const result = await registerHandle(mockHandle);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many requests');
    });

    it('should register a new handle successfully', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(resolveIdentity).mockResolvedValue({ did: 'did:plc:new', handle: 'new.handle', pdsUrl: 'http://pds' });
      vi.mocked(getAssociations).mockResolvedValue([]);
      vi.mocked(addAssociation).mockResolvedValue({} as AssociationWithProfile);

      const result = await registerHandle(mockHandle);

      expect(result.success).toBe(true);
      expect(addAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:new', 'new.handle', 'http://pds');
    });

    it('should update metadata if DID already exists', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(resolveIdentity).mockResolvedValue({ did: 'did:plc:existing', handle: 'new.handle', pdsUrl: 'http://new-pds' });
      vi.mocked(getAssociations).mockResolvedValue([{ did: 'did:plc:existing', handle: 'old.handle' } as unknown as AssociationWithProfile]);

      const result = await registerHandle(mockHandle);

      expect(result.success).toBe(true);
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:existing', {
        handle: 'new.handle',
        pdsUrl: 'http://new-pds'
      });
    });

    it('should fail if pdsUrl is missing in identity', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      // pdsUrl is empty, which should trigger the early return
      vi.mocked(resolveIdentity).mockResolvedValue({ did: 'did:plc:existing', handle: 'new.handle', pdsUrl: '' });
      vi.mocked(getAssociations).mockResolvedValue([{ did: 'did:plc:existing', handle: 'old.handle' } as unknown as AssociationWithProfile]);

      const result = await registerHandle(mockHandle);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Handle not found or missing PDS');
    });

    it('should return error if handle resolution fails', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(resolveIdentity).mockResolvedValue(null);
      const result = await registerHandle(mockHandle);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Handle not found or missing PDS');
    });

    it('should handle unexpected errors in registerHandle', async () => {
      vi.mocked(getSessionUuid).mockRejectedValue(new Error('Unexpected'));
      const result = await registerHandle(mockHandle);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('setPrimaryAssociation', () => {
    it('should set primary association correctly', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: 'did:1', isPrimary: true } as unknown as AssociationWithProfile,
        { did: 'did:2', isPrimary: false } as unknown as AssociationWithProfile,
      ]);

      await setPrimaryAssociation('did:2' as any);

      // did:2 should become primary
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:2', { isPrimary: true });
      // did:1 should stop being primary
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:1', { isPrimary: false });
    });

    it('should skip if not authorized or no session', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      await setPrimaryAssociation(mockDid);
      expect(getAssociations).not.toHaveBeenCalled();
    });
  });

  describe('refreshAssociation', () => {
    it('should update on success', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(resolveIdentity).mockResolvedValue({ did: mockDid, handle: 'new.h', pdsUrl: 'new.p' });
      await refreshAssociation(mockDid);
      expect(updateAssociation).toHaveBeenCalled();
    });

    it('should skip if rate limited', async () => {
      vi.mocked(isRateLimited).mockReturnValue(true);
      await refreshAssociation(mockDid);
      expect(updateAssociation).not.toHaveBeenCalled();
    });
  });

  describe('moveAssociation', () => {
    it('should swap sort orders when moving up', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: 'did:plc:1', sortOrder: 0 } as unknown as AssociationWithProfile,
        { did: 'did:plc:2', sortOrder: 1 } as unknown as AssociationWithProfile,
      ]);

      await moveAssociation('did:plc:2', 'up');

      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:2', { sortOrder: 0 });
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:1', { sortOrder: 1 });
    });

    it('should swap sort orders when moving down', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: 'did:plc:1', sortOrder: 0 } as unknown as AssociationWithProfile,
        { did: 'did:plc:2', sortOrder: 1 } as unknown as AssociationWithProfile,
      ]);

      await moveAssociation('did:plc:1', 'down');

      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:1', { sortOrder: 1 });
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:2', { sortOrder: 0 });
    });

    it('should do nothing if DID not found', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([]);
      await moveAssociation('nonexistent' as any, 'up');
      expect(updateAssociation).not.toHaveBeenCalled();
    });

    it('should do nothing if moving up from index 0', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: 'did:plc:1', sortOrder: 0 } as unknown as AssociationWithProfile,
      ]);
      await moveAssociation('did:plc:1', 'up');
      expect(updateAssociation).not.toHaveBeenCalled();
    });

    it('should do nothing if moving down from last index', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: 'did:plc:1', sortOrder: 0 } as unknown as AssociationWithProfile,
      ]);
      await moveAssociation('did:plc:1', 'down');
      expect(updateAssociation).not.toHaveBeenCalled();
    });
  });

  describe('syncWithToken', () => {
    it('should return error if rate limited', async () => {
      vi.mocked(isRateLimited).mockReturnValue(true);
      const result = await syncWithToken('token');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many requests');
    });

    it('should return error if token invalid', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getUuidByShareToken).mockResolvedValue(null);
      const result = await syncWithToken('invalid');
      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_token');
    });

    it('should set session cookie if token is valid', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getUuidByShareToken).mockResolvedValue('target-uuid');
      vi.mocked(createSessionToken).mockResolvedValue('session-token');
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ set: mockCookieSet } as any);

      const result = await syncWithToken('valid-token');

      expect(result.success).toBe(true);
      expect(mockCookieSet).toHaveBeenCalledWith(expect.any(String), 'session-token', expect.any(Object));
    });
  });

  describe('initializeSession', () => {
    it('should skip if rate limited', async () => {
      vi.mocked(isRateLimited).mockReturnValue(true);
      await initializeSession();
      expect(getSessionUuid).not.toHaveBeenCalled();
    });

    it('should return early if uuid exists', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getSessionUuid).mockResolvedValue('existing');
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ set: mockCookieSet } as any);
      await initializeSession();
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it('should retry if UUID collision occurs and eventually succeed', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      // Collide 3 times, then succeed
      vi.mocked(getAssociations)
        .mockResolvedValueOnce([{ did: 'did:1' } as unknown as AssociationWithProfile])
        .mockResolvedValueOnce([{ did: 'did:2' } as unknown as AssociationWithProfile])
        .mockResolvedValueOnce([{ did: 'did:3' } as unknown as AssociationWithProfile])
        .mockResolvedValueOnce([]);
      
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ set: mockCookieSet } as any);

      await initializeSession();

      expect(getAssociations).toHaveBeenCalledTimes(4);
      expect(mockCookieSet).toHaveBeenCalled();
    });

    it('should set a new session cookie if none exists', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      vi.mocked(getAssociations).mockResolvedValue([]);
      vi.mocked(createSessionToken).mockResolvedValue('new-token');
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn(), set: mockCookieSet } as any);

      await initializeSession();

      expect(mockCookieSet).toHaveBeenCalledWith(SESSION_COOKIE_NAME, 'new-token', expect.any(Object));
    });

    it('should eventually stop retrying in initializeSession if collision continues', async () => {
      vi.mocked(isRateLimited).mockReturnValue(false);
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      // Always return associations (collision)
      vi.mocked(getAssociations).mockResolvedValue([{ did: 'did:1' } as unknown as AssociationWithProfile]);
      
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ set: mockCookieSet } as any);

      await initializeSession();

      // Should have attempted 5 times in the while loop (attempts 0 to 4)
      expect(getAssociations).toHaveBeenCalledTimes(5);
      expect(mockCookieSet).toHaveBeenCalled();
    });
  });

  describe('removeAssociation', () => {
    it('should call deleteAssociation', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      await removeAssociation(mockDid);
      expect(deleteAssociation).toHaveBeenCalledWith(mockUuid, mockDid);
    });
  });
});
