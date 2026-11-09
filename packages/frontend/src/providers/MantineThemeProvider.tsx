'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { setNonce } from 'get-nonce';

export const theme = createTheme({
  colors: {
    gray: [
      '#f8f9fa',
      '#f1f3f5',
      '#e9ecef',
      '#dee2e6',
      '#ced4da',
      '#adb5bd',
      '#737373', // Overridden gray.6 to achieve contrast >= 4.5:1 on white background
      '#495057',
      '#343a40',
      '#212529',
    ],
    blue: [
      '#e7f5ff',
      '#d0ebff',
      '#a5d8ff',
      '#74c0fc',
      '#4dabf7',
      '#339af0',
      '#1a73e8', // Overridden blue.6 to achieve contrast >= 4.5:1 with white text
      '#1c7ed6',
      '#1971c2',
      '#1864ab',
    ],
  },
  components: {
    Badge: {
      styles: {
        root: {
          height: '34px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '0',
          paddingBottom: '0',
          overflow: 'visible',
        },
        inner: {
          lineHeight: '1.2',
          overflow: 'visible',
          textTransform: 'none',
          display: 'block',
          paddingTop: '6px',
          paddingBottom: '2px',
        },
      },
    },
  },
});

export function MantineThemeProvider({ 
  children, 
  defaultColorScheme,
  nonce,
}: { 
  children: React.ReactNode;
  defaultColorScheme: 'light' | 'dark' | 'auto';
  nonce?: string;
}) {
  // Keep the document nonce across client navigation. Scroll-lock styles use
  // get-nonce rather than Mantine's context. Never set its global state on SSR.
  const styleNonce = (typeof document !== 'undefined' ? document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce : undefined) || nonce || '';
  if (typeof document !== 'undefined') setNonce(styleNonce);
  return (
    <MantineProvider theme={theme} defaultColorScheme={defaultColorScheme}
      getStyleNonce={() => styleNonce}>
      {children}
    </MantineProvider>
  );
}
