'use client';

import { Text, Stack, Box, Title, Alert } from '@mantine/core';
import { AuthAccountItem } from "./AuthAccountItem";
import { RegisterForm } from "./RegisterForm";
import { useTranslations } from "next-intl";
import { useState, useEffect } from 'react';
import { refreshAssociation, removeAssociation, moveAssociation } from '@/lib/actions';
import { type AssociationWithProfile } from '@/lib/models';
import { IconAlertTriangle } from '@tabler/icons-react';

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
  const [authenticating, setAuthenticating] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AssociationWithProfile | null>(null);

  useEffect(() => {
    setItems(initialItems);
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
    await refreshAssociation(did);
  };

  const handleSelect = (item: AssociationWithProfile) => {
    setSelectedItem(item);
    setAuthenticating(true);
  };

  const handleDelete = async (did: string) => {
    setItems(prev => prev.filter(item => item.did !== did));
    await removeAssociation(did);
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

    setItems(newItems);
    await moveAssociation(did, direction);
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
        <Alert variant="light" color="orange" title={t('loopback_warning_title')} icon={<IconAlertTriangle size={16} />}>
          <Text size="xs">
            {t('loopback_warning_message')}
          </Text>
        </Alert>
      ) : !isVerified && (
        <Alert variant="light" color="orange" title={t('unverified_domain_title')} icon={<IconAlertTriangle size={16} />}>
          <Text size="xs">
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
