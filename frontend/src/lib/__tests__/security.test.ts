import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  verifyDomain, 
  getVerifiedDomainFromDb, 
  verifyDomainInDb, 
  deleteVerifiedDomainFromDb,
  getPublicVerifiedDomains,
  getVerifiedDomainsByDid
} from '../security';
import { db } from '../db';

describe('Security Library', () => {
  describe('verifyDomain', () => {
    it('should verify exact domain match', () => {
      const result = verifyDomain('example.com', ['example.com']);
      expect(result.verified).toBe(true);
      expect(result.reason).toBe('match');
    });

    it('should verify subdomain match', () => {
      const result = verifyDomain('sub.example.com', ['example.com']);
      expect(result.verified).toBe(true);
      expect(result.reason).toBe('match');
    });

    it('should allow localhost and ip', () => {
      const resp1 = verifyDomain('localhost', []);
      expect(resp1.verified).toBe(true);
      expect(resp1.reason).toBe('localhost');

      const resp2 = verifyDomain('127.0.0.1', []);
      expect(resp2.verified).toBe(true);
      expect(resp2.reason).toBe('localhost');

      const resp3 = verifyDomain('myapp.localhost', []);
      expect(resp3.verified).toBe(true);
      expect(resp3.reason).toBe('localhost');

      const resp4 = verifyDomain('dev.local', []); // Should NOT be localhost
      expect(resp4.reason).toBe('unverified');
    });

    it('should reject banned domains', () => {
      expect(verifyDomain('evil.example.com', ['evil.example.com']).verified).toBe(false);
    });
  });

  describe('Database Operations', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('AWS_ACCESS_KEY_ID', ''); 
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it('should verify and retrieve a domain', async () => {
      const domain = 'test.com';
      await verifyDomainInDb(domain, 'did:1', 'h1', true, 'oauth');
      const result = await getVerifiedDomainFromDb(domain);
      expect(result?.domain).toBe(domain);
    });

    it('should handle production mode (real DB call)', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('AWS_ACCESS_KEY_ID', 'fake');
      
      const mockSend = vi.spyOn(db, 'send').mockResolvedValue({ Item: { domain: 'prod.com' } } as never);
      
      const result = await getVerifiedDomainFromDb('prod.com');
      expect(result?.domain).toBe('prod.com');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle DB errors gracefully', async () => {
      vi.spyOn(db, 'send').mockRejectedValue(new Error('DB Error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(await getVerifiedDomainFromDb('err.com')).toBeNull();
      expect(await getPublicVerifiedDomains()).toEqual([]);
      expect(await getVerifiedDomainsByDid('did')).toEqual([]);
      
      await verifyDomainInDb('err.com', 'd', 'h');
      expect(consoleSpy).toHaveBeenCalled();
      
      await deleteVerifiedDomainFromDb('err.com');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should filter public domains correctly', async () => {
      await verifyDomainInDb('pub.com', 'did:1', 'h1', true);
      await verifyDomainInDb('priv.com', 'did:1', 'h1', false);
      
      const publicOnes = await getPublicVerifiedDomains();
      expect(publicOnes.some(d => d.domain === 'pub.com')).toBe(true);
      expect(publicOnes.some(d => d.domain === 'priv.com')).toBe(false);
    });

    it('should find domains by DID', async () => {
      const did = 'did:specific';
      await verifyDomainInDb('mine.com', did, 'h1');
      const mine = await getVerifiedDomainsByDid(did);
      expect(mine[0].domain).toBe('mine.com');
    });

    it('should delete domains', async () => {
      await verifyDomainInDb('del.com', 'did:1', 'h1');
      await deleteVerifiedDomainFromDb('del.com');
      expect(await getVerifiedDomainFromDb('del.com')).toBeNull();
    });
  });
});
