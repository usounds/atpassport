// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import { IdpRegistrationControl } from '../IdpRegistrationControl';
import * as fedcmClient from '@/lib/fedcm-session-client';
import { notifications } from '@mantine/notifications';

vi.mock('@/lib/fedcm-session-client', () => ({
  hasIdpRegistrationSupport: vi.fn(),
  registerIdp: vi.fn(),
  unregisterIdp: vi.fn(),
}));

vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  return {
    ...actual,
    Collapse: ({ children, expanded }: { children: React.ReactNode; expanded: boolean }) =>
      expanded ? <div>{children}</div> : null,
  };
});

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

describe('IdpRegistrationControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when browser lacks IdentityProvider support', () => {
    vi.mocked(fedcmClient.hasIdpRegistrationSupport).mockReturnValue(false);

    const { container } = render(<IdpRegistrationControl />);

    expect(container.querySelector('.mantine-Paper-root')).toBeNull();
    expect(screen.queryByText('IdP Registration')).not.toBeInTheDocument();
  });

  it('renders the control with title and experimental badge when supported', () => {
    vi.mocked(fedcmClient.hasIdpRegistrationSupport).mockReturnValue(true);

    render(<IdpRegistrationControl />);

    expect(screen.getByText('IdP Registration')).toBeInTheDocument();
    expect(screen.getByText('Experimental')).toBeInTheDocument();
  });

  it('shows action buttons when browser supports IdentityProvider and handles register', async () => {
    vi.mocked(fedcmClient.hasIdpRegistrationSupport).mockReturnValue(true);
    vi.mocked(fedcmClient.registerIdp).mockResolvedValue({ success: true });

    render(<IdpRegistrationControl />);

    // Click to expand
    fireEvent.click(screen.getByText('IdP Registration'));

    const registerBtn = await screen.findByRole('button', { name: 'Register IdP' });
    expect(registerBtn).toBeInTheDocument();

    fireEvent.click(registerBtn);

    await waitFor(() => {
      expect(fedcmClient.registerIdp).toHaveBeenCalledTimes(1);
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'green',
          message: 'Successfully registered in browser as an IdP',
        })
      );
    });
  });

  it('handles unregister correctly', async () => {
    vi.mocked(fedcmClient.hasIdpRegistrationSupport).mockReturnValue(true);
    vi.mocked(fedcmClient.unregisterIdp).mockResolvedValue({ success: true });

    render(<IdpRegistrationControl />);

    // Click to expand
    fireEvent.click(screen.getByText('IdP Registration'));

    const unregisterBtn = await screen.findByRole('button', { name: 'Unregister IdP' });
    expect(unregisterBtn).toBeInTheDocument();

    fireEvent.click(unregisterBtn);

    await waitFor(() => {
      expect(fedcmClient.unregisterIdp).toHaveBeenCalledTimes(1);
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          color: 'blue',
          message: 'Successfully unregistered from browser',
        })
      );
    });
  });
});
