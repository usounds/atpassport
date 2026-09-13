'use client';

import { useEffect } from 'react';
import { ensureFedCmSession } from '@/lib/fedcm-session-client';

export function FedCmSessionMigration() {
  useEffect(() => {
    void ensureFedCmSession();
  }, []);

  return null;
}
