import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  registerHandle, 
  moveAssociation, 
  syncWithToken, 
  refreshAssociation, 
  initializeSession,
  claimDomainOwnership,
  verifyDomainViaOAuth,
  verifyDomainByFile,
  withdrawDomain,
  updateDomainSettings,
  removeAssociation
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
        { did: mockDid, handle: 'user.com' } as AssociationWithProfile
      ]);

      const result = await claimDomainOwnership(mockDid);

      expect(result.success).toBe(true);
      expect(verifyDomainInDb).toHaveBeenCalledWith('user.com', mockDid, 'user.com', true, 'oauth');
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('should fail if handle is infrastructure domain', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid, handle: 'bsky.social' } as AssociationWithProfile
      ]);

      const result = await claimDomainOwnership(mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Infrastructure');
    });

    it('should fail if handle does not contain a dot', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: mockDid, handle: 'localhost' } as AssociationWithProfile
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
  });

  describe('verifyDomainViaOAuth', () => {
    it('should resolve identity and verify in DB', async () => {
      vi.mocked(resolveIdentity).mockResolvedValue({ did: mockDid, handle: 'user.test', pdsUrl: 'http://pds' });
      
      const result = await verifyDomainViaOAuth(mockDid, true);
      
      expect(result.success).toBe(true);
      expect(verifyDomainInDb).toHaveBeenCalledWith('user.test', mockDid, 'user.test', true, 'oauth');
    });

    it('should return error if identity not found', async () => {
      vi.mocked(resolveIdentity).mockResolvedValue(null);
      const result = await verifyDomainViaOAuth(mockDid, true);
      expect(result.success).toBe(false);
    });
  });

  describe('verifyDomainByFile', () => {
    const domain = 'verify.me';

    it('should verify via well-known file', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => `atpassport-verification: ${mockDid}`
      } as Response);
      vi.mocked(resolveIdentity).mockResolvedValue({ did: mockDid, handle: 'user.test', pdsUrl: 'http://pds' });

      const result = await verifyDomainByFile(domain, mockDid, true);

      expect(result.success).toBe(true);
      expect(verifyDomainInDb).toHaveBeenCalledWith(domain, mockDid, 'user.test', true, 'file');
    });

    it('should fail if fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404 } as Response);
      const result = await verifyDomainByFile(domain, mockDid, true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Could not reach');
    });

    it('should fail if content mismatch', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        text: async () => 'wrong content'
      } as Response);
      const result = await verifyDomainByFile(domain, mockDid, true);
      expect(result.success).toBe(false);
      expect(result.error).toContain('content mismatch');
    });
  });

  describe('withdrawDomain', () => {
    const domain = 'remove.me';

    it('should delete if user is owner', async () => {
      vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
        domain, verifiedByDid: mockDid, handle: 'h', status: 'approved', verifiedAt: 't'
      });

      const result = await withdrawDomain(domain, mockDid);

      expect(result.success).toBe(true);
      expect(deleteVerifiedDomainFromDb).toHaveBeenCalledWith(domain);
    });

    it('should fail if user is not owner', async () => {
      vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
        domain, verifiedByDid: 'other', handle: 'h', status: 'approved', verifiedAt: 't'
      });

      const result = await withdrawDomain(domain, mockDid);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized or domain not found');
    });
  });

  describe('updateDomainSettings', () => {
    it('should update isPublic setting', async () => {
      const domain = 'update.me';
      vi.mocked(getVerifiedDomainFromDb).mockResolvedValue({
        domain, verifiedByDid: mockDid, handle: 'h', status: 'approved', verifiedAt: 't', method: 'file'
      });

      const result = await updateDomainSettings(domain, mockDid, false);

      expect(result.success).toBe(true);
      expect(verifyDomainInDb).toHaveBeenCalledWith(domain, mockDid, 'h', false, 'file');
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
      vi.mocked(getAssociations).mockResolvedValue([{ did: 'did:plc:existing', handle: 'old.handle' } as AssociationWithProfile]);

      const result = await registerHandle(mockHandle);

      expect(result.success).toBe(true);
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:existing', {
        handle: 'new.handle',
        pdsUrl: 'http://new-pds'
      });
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

  describe('syncWithToken', () => {
    it('should return error if token invalid', async () => {
      vi.mocked(getUuidByShareToken).mockResolvedValue(null);
      const result = await syncWithToken('invalid');
      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_token');
    });
  });

  describe('initializeSession', () => {
    it('should return early if uuid exists', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue('existing');
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ set: mockCookieSet } as unknown as ReturnType<typeof cookies>);
      await initializeSession();
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it('should retry if UUID collision occurs', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      // First call returns existing, second returns empty (no collision)
      vi.mocked(getAssociations)
        .mockResolvedValueOnce([{ did: 'did:1' } as AssociationWithProfile])
        .mockResolvedValueOnce([]);
      
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ set: mockCookieSet } as unknown as ReturnType<typeof cookies>);

      await initializeSession();

      expect(getAssociations).toHaveBeenCalledTimes(2);
      expect(mockCookieSet).toHaveBeenCalled();
    });
  });

  describe('moveAssociation', () => {
    it('should swap sort orders when moving up', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: 'did:plc:1', sortOrder: 0 } as AssociationWithProfile,
        { did: 'did:plc:2', sortOrder: 1 } as AssociationWithProfile,
      ]);

      await moveAssociation('did:plc:2', 'up');

      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:2', { sortOrder: 0 });
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:1', { sortOrder: 1 });
    });

    it('should swap sort orders when moving down', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(mockUuid);
      vi.mocked(getAssociations).mockResolvedValue([
        { did: 'did:plc:1', sortOrder: 0 } as AssociationWithProfile,
        { did: 'did:plc:2', sortOrder: 1 } as AssociationWithProfile,
      ]);

      await moveAssociation('did:plc:1', 'down');

      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:1', { sortOrder: 1 });
      expect(updateAssociation).toHaveBeenCalledWith(mockUuid, 'did:plc:2', { sortOrder: 0 });
    });
  });

  describe('syncWithToken', () => {
    it('should return error if token invalid', async () => {
      vi.mocked(getUuidByShareToken).mockResolvedValue(null);
      const result = await syncWithToken('invalid');
      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_token');
    });

    it('should set session cookie if token is valid', async () => {
      vi.mocked(getUuidByShareToken).mockResolvedValue('target-uuid');
      vi.mocked(createSessionToken).mockResolvedValue('session-token');
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ set: mockCookieSet } as unknown as ReturnType<typeof cookies>);

      const result = await syncWithToken('valid-token');

      expect(result.success).toBe(true);
      expect(mockCookieSet).toHaveBeenCalledWith(expect.any(String), 'session-token', expect.any(Object));
    });
  });

  describe('initializeSession', () => {
    it('should set a new session cookie if none exists', async () => {
      vi.mocked(getSessionUuid).mockResolvedValue(null);
      vi.mocked(getAssociations).mockResolvedValue([]);
      vi.mocked(createSessionToken).mockResolvedValue('new-token');
      const mockCookieSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({ get: vi.fn(), set: mockCookieSet } as unknown as ReturnType<typeof cookies>);

      await initializeSession();

      expect(mockCookieSet).toHaveBeenCalledWith(SESSION_COOKIE_NAME, 'new-token', expect.any(Object));
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
