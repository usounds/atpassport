import { Container, Text, Center } from '@mantine/core';
import { getTranslations } from 'next-intl/server';
import { AuthAccountList } from '@/components/AuthAccountList';
import { getAssociations, type AssociationWithProfile } from '@/lib/models';
import { getSessionUuid } from '@/lib/session';
import { getProfile } from '@/lib/atproto';
import { verifyDomain, getVerifiedDomainFromDb, verifyDomainInDb } from '@/lib/security';

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callback?: string; atpstate?: string }>;
}) {
  const { locale } = await params;
  const { callback, atpstate } = await searchParams;
  const t = await getTranslations({ locale, namespace: 'Auth' });

  if (!callback) {
    return (
      <Container size="sm" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Text c="red" size="lg">{t('missing_callback')}</Text>
        </Center>
      </Container>
    );
  }

  let domain = '';
  let urlError: string | null = null;
  let isLoopback = false;
  try {
    const url = new URL(callback);
    domain = url.hostname;
    const lowerHostname = domain.toLowerCase();
    isLoopback = lowerHostname === 'localhost' || lowerHostname === '127.0.0.1' || lowerHostname.endsWith('.localhost');

    // Enforce HTTPS for callback URL, except for loopback
    if (url.protocol !== 'https:' && !isLoopback) {
      urlError = 'Invalid callback URL: HTTPS is required';
    }
  } catch {
    urlError = 'Invalid callback URL';
  }

  if (urlError) {
    return (
      <Container size="sm" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Text c="red" size="lg">{urlError}</Text>
        </Center>
      </Container>
    );
  }

  // Fetch associations on the server
  const uuid = await getSessionUuid();
  let items: AssociationWithProfile[] = [];
  if (uuid) {
    const associations = await getAssociations(uuid);
    items = await Promise.all(
      associations.map(async (assoc) => {
        const profile = await getProfile(assoc.did);
        return { ...assoc, profile };
      })
    );
  }

  // 1. Check if domain is already verified in DB (including parent domains)
  let verified = false;
  let reason: string | undefined = undefined;

  // Check the domain and its parent domains
  // Check the domain and its parent domains
  const lowerDomain = domain.toLowerCase();
  const domainParts = lowerDomain.split('.');
  for (let i = 0; i < domainParts.length - 1; i++) {
    const currentDomain = domainParts.slice(i).join('.');
    const dbEntry = await getVerifiedDomainFromDb(currentDomain);
    if (dbEntry) {
      // file (well-known) verification: exact match only, no subdomain coverage
      // oauth (handle) verification: subdomains are also covered
      if (i === 0 || dbEntry.method !== 'file') {
        verified = true;
        reason = 'db';
        break;
      }
    }
  }

  // 2. If not verified in DB, check against user's current handles
  if (!verified) {
    const handles = items.map(i => i.handle);
    const result = verifyDomain(domain, handles);
    verified = result.verified;
    reason = result.reason;

    // 3. If verified by handle, save to DB for future use (default to public)
    if (verified && reason === 'match') {
      // Find which handle matched (exact or parent)
      const matchingHandle = handles.find(h => {
        const lh = h.toLowerCase();
        return lowerDomain === lh || lowerDomain.endsWith('.' + lh);
      });
      if (matchingHandle) {
        const matchingItem = items.find(i => i.handle === matchingHandle);
        if (matchingItem) {
          await verifyDomainInDb(matchingHandle, matchingItem.did, true);
        }
      }
    }
  }

  // If banned, block immediately
  if (reason === 'banned') {
    return (
      <Container size="sm" py="xl">
        <Center style={{ minHeight: '60vh' }}>
          <Text c="red" size="lg">Access denied: This domain is banned.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl" style={{ maxWidth: 500 }}>
      <AuthAccountList
        initialItems={items}
        callback={callback}
        atpstate={atpstate}
        domain={domain}
        isVerified={verified}
        isLoopback={isLoopback}
      />
    </Container>
  );
}
