import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MantineProvider, createTheme } from '@mantine/core';
import { NextIntlClientProvider } from 'next-intl';

const theme = createTheme({});

// Ensure all required messages are present
const messages = {
  Home: {
    manage_handle: 'Manage Handle',
    move_up: 'Move Up',
    move_down: 'Move Down',
    refresh_metadata: 'Refresh Metadata',
    delete: 'Delete',
    confirm_delete_title: 'Confirm Delete',
    confirm_delete_text: 'Are you sure you want to delete {handle}?',
    cancel: 'Cancel',
    add_handle: 'Add Handle',
    handle: 'Handle',
    placeholder_handle: 'e.g. alice.bsky.social',
    register: 'Add',
    agree_to_terms: 'I agree to the <terms>Terms</terms> and <privacy>Privacy Policy</privacy>',
    handle_not_found: 'Handle not found or missing PDS',
    already_registered: 'This handle is already registered',
    invalid_handle: 'Invalid handle format',
    handle_limit_reached: 'Maximum 15 handles allowed.',
    title: '@passport',
  }
};

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MantineProvider theme={theme}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {children}
      </NextIntlClientProvider>
    </MantineProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
