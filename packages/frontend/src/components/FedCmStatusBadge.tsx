'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@mantine/core';
import { IconShieldCheck } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { ensureFedCmSession } from '@/lib/fedcm-session-client';

export function FedCmStatusBadge() {
  const t = useTranslations('Home');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void ensureFedCmSession().then(setReady);
  }, []);

  if (!ready) return null;

  return (
    <Badge
      color="green"
      variant="light"
      size="lg"
      leftSection={<IconShieldCheck size={14} />}
    >
      {t('fedcm_ready')}
    </Badge>
  );
}
