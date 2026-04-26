'use client';

import { MantineProvider, createTheme } from '@mantine/core';

export const theme = createTheme({
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
  defaultColorScheme 
}: { 
  children: React.ReactNode;
  defaultColorScheme: 'light' | 'dark' | 'auto';
}) {
  return (
    <MantineProvider theme={theme} defaultColorScheme={defaultColorScheme}>
      {children}
    </MantineProvider>
  );
}
