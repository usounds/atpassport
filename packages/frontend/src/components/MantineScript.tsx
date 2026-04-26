'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { ColorSchemeScript } from '@mantine/core';
import { theme } from '@/providers/MantineThemeProvider';

export function MantineScript({ defaultColorScheme }: { defaultColorScheme: 'light' | 'dark' | 'auto' }) {
  useServerInsertedHTML(() => (
    <ColorSchemeScript defaultColorScheme={defaultColorScheme} nonce={undefined} />
  ));
  return null;
}
