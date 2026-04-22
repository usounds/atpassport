'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { ColorSchemeScript } from '@mantine/core';

export function MantineScript({ defaultColorScheme }: { defaultColorScheme: 'light' | 'dark' | 'auto' }) {
  useServerInsertedHTML(() => (
    <ColorSchemeScript defaultColorScheme={defaultColorScheme} />
  ));
  return null;
}
