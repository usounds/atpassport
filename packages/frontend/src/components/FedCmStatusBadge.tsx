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
      variant="transparent"
      color="gray"
      size="xs"
      p={0}
      leftSection={<IconShieldCheck size={11} style={{ opacity: 0.6 }} />}
      styles={{
        root: {
          fontWeight: 400,
          textTransform: 'none',
          color: 'var(--mantine-color-dimmed)',
          opacity: 0.5,
          cursor: 'default',
        },
      }}
    >
      {t('fedcm_ready')}
    </Badge>
  );
}
