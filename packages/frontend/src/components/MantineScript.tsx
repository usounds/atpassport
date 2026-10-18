'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { ColorSchemeScript } from '@mantine/core';

export function MantineScript({
  defaultColorScheme,
  nonce,
}: {
  defaultColorScheme: 'light' | 'dark' | 'auto';
  nonce?: string;
}) {
  useServerInsertedHTML(() => (
    <ColorSchemeScript defaultColorScheme={defaultColorScheme} nonce={nonce} />
  ));
  return null;
}
