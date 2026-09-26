'use client';

import { Text, Stack, Box, Title, Alert } from '@mantine/core';
import { AuthAccountItem } from "./AuthAccountItem";
import { RegisterForm } from "./RegisterForm";
import { useTranslations } from "next-intl";
import { useState, useEffect } from 'react';
import { refreshAssociation, removeAssociation, moveAssociation } from '@/lib/actions';
import { type AssociationWithProfile } from '@/lib/models';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useProfileStore } from '@/lib/profile-store';
import { toFedCmAccount, syncAccountsPush } from '@/lib/fedcm-session-client';

export function AuthAccountList({ 
  initialItems, 
  callback, 
  atpstate, 
  domain,
  isVerified = false,
  isLoopback = false,
}: { 
  initialItems: AssociationWithProfile[]; 
  callback: string; 
  atpstate?: string;
  domain: string;
  isVerified?: boolean;
  isLoopback?: boolean;
}) {
  const t = useTranslations('Auth');
  const [items, setItems] = useState(initialItems);
  const [prevInitialItems, setPrevInitialItems] = useState(initialItems);

  // Sync state with prop if initialItems changes during render
  if (initialItems !== prevInitialItems) {
    setPrevInitialItems(initialItems);
    setItems(initialItems.map(initialItem => {
      const existing = items.find(p => p.did === initialItem.did);
      return {
        ...initialItem,
        profile: existing?.profile || initialItem.profile
      };
    }));
  }

  const [authenticating, setAuthenticating] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AssociationWithProfile | null>(null);

  useEffect(() => {
    void syncAccountsPush(initialItems.map(toFedCmAccount));

    const fetchProfiles = async () => {
      // Find DIDs that don't have a profile in the current items
      const didsToFetch = initialItems
        .filter(item => !item.profile)
        .map(item => item.did);
      
      if (didsToFetch.length === 0) return;

      console.log('[AuthAccountList] Fetching profiles for %s missing items...', didsToFetch.length);
      const profilesMap = await useProfileStore.getState().fetchProfiles(didsToFetch);
      
      setItems(prev => {
        const updated = prev.map(item => {
          const fetchedProfile = profilesMap[item.did];
          if (fetchedProfile) {
            return { ...item, profile: fetchedProfile };
          }
          return item;
        });
        void syncAccountsPush(updated.map(toFedCmAccount));
        return updated;
      });
    };

    fetchProfiles();
  }, [initialItems]);

  const normalizePds = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      if (hostname.endsWith('.bsky.network')) {
        return 'bsky.social';
      }
      return hostname;
    } catch {
      return '';
    }
  };

  const handleRefresh = async (did: string) => {
    try {
      await refreshAssociation(did);
      const profilesMap = await useProfileStore.getState().fetchProfiles([did]);
      if (profilesMap[did]) {
        setItems(prev => {
          const updated = prev.map(item => item.did === did ? { ...item, profile: profilesMap[did] } : item);
          void syncAccountsPush(updated.map(toFedCmAccount));
          return updated;
        });
      }
    } catch (e) {
      console.error('[AuthAccountList] Failed to refresh association:', e);
    }
  };

  const handleSelect = (item: AssociationWithProfile) => {
    setSelectedItem(item);
    setAuthenticating(true);
  };

  const handleDelete = async (did: string) => {
    const previousItems = items;
    const nextItems = items.filter(item => item.did !== did);
    setItems(nextItems);

    try {
      await removeAssociation(did);
      void syncAccountsPush(nextItems.map(toFedCmAccount));
    } catch (e) {
      console.error('[AuthAccountList] Failed to delete association:', e);
      setItems(previousItems);
    }
  };

  const handleMove = async (did: string, direction: 'up' | 'down') => {
    const index = items.findIndex(item => item.did === did);
    if (index === -1) return;

    const newItems = [...items];
    if (direction === 'up' && index > 0) {
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    } else if (direction === 'down' && index < items.length - 1) {
      [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
    } else {
      return;
    }

    const previousItems = items;
    setItems(newItems);

    try {
      await moveAssociation(did, direction);
      void syncAccountsPush(newItems.map(toFedCmAccount));
    } catch (e) {
      console.error('[AuthAccountList] Failed to move association:', e);
      setItems(previousItems);
    }
  };

  if (authenticating && selectedItem) {
    const pds = normalizePds(selectedItem.pdsUrl);
    return (
      <Stack gap="xl" py="md">
        <Box>
          <AuthAccountItem 
            item={selectedItem}
            callback={callback}
            atpstate={atpstate}
            onSelect={() => {}}
            disabled={true}
            selected={true}
            hideMenu={true}
          />
        </Box>
        <Box px="sm" ta="center">
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
            {t('authenticating_message', { domain, pds })}
          </Text>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <header style={{ textAlign: 'center' }}>
        <Title order={3} mb="xs">{t('title')}</Title>
        <Text c="dimmed" size="xs" fw={500}>{t('moving_to', { domain })}</Text>
      </header>

      {isLoopback ? (
        <Alert 
          variant="light" 
          color="orange" 
          title={t('loopback_warning_title')} 
          icon={<IconAlertTriangle size={18} />}
          radius="md"
          styles={{
            root: {
              backgroundColor: 'light-dark(var(--mantine-color-orange-light), rgba(255, 145, 0, 0.05))',
              border: '1px solid light-dark(transparent, rgba(255, 145, 0, 0.2))'
            },
            title: {
              fontSize: '0.85rem',
              fontWeight: 700
            }
          }}
        >
          <Text size="xs" style={{ lineHeight: 1.5 }}>
            {t('loopback_warning_message')}
          </Text>
        </Alert>
      ) : !isVerified && (
        <Alert 
          variant="light" 
          color="orange" 
          title={t('unverified_domain_title')} 
          icon={<IconAlertTriangle size={18} />}
          radius="md"
          styles={{
            root: {
              backgroundColor: 'light-dark(var(--mantine-color-orange-light), rgba(255, 145, 0, 0.05))',
              border: '1px solid light-dark(transparent, rgba(255, 145, 0, 0.2))'
            },
            title: {
              fontSize: '0.85rem',
              fontWeight: 700
            }
          }}
        >
          <Text size="xs" style={{ lineHeight: 1.5 }}>
            {t('unverified_domain_message', { domain })}
          </Text>
        </Alert>
      )}

      {items.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">
          {t('no_accounts')}
        </Text>
      ) : (
        <Stack gap={0} className="flat-list-container">
          {items.map((item, index) => (
            <AuthAccountItem 
              key={`${item.did}-${index}`} 
              item={item} 
              callback={callback}
              atpstate={atpstate}
              onSelect={handleSelect}
              onRefresh={() => handleRefresh(item.did)}
              onDelete={() => handleDelete(item.did)}
              onMoveUp={() => handleMove(item.did, 'up')}
              onMoveDown={() => handleMove(item.did, 'down')}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              disabled={authenticating}
              index={index}
            />
          ))}
        </Stack>
      )}

      <RegisterForm handleCount={items.length} />
    </Stack>
  );
}
