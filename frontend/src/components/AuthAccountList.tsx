'use client';

import { Text, Stack } from '@mantine/core';
import { AuthAccountItem } from "./AuthAccountItem";
import { useTranslations } from "next-intl";
import { useState } from 'react';

export function AuthAccountList({ 
  initialItems, 
  callback, 
  atpstate, 
  domain 
}: { 
  initialItems: any[]; 
  callback: string; 
  atpstate?: string;
  domain: string;
}) {
  const t = useTranslations('Auth');
  const [authenticating, setAuthenticating] = useState(false);

  if (initialItems.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t('no_accounts')}
      </Text>
    );
  }

  return (
    <Stack gap={0} className="flat-list-container">
      {initialItems.map((item, index) => (
        <AuthAccountItem 
          key={`${item.did}-${index}`} 
          item={item} 
          callback={callback}
          atpstate={atpstate}
          domain={domain}
          onSelect={() => setAuthenticating(true)}
          disabled={authenticating}
          index={index}
        />
      ))}
    </Stack>
  );
}
