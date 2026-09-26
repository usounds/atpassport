import { browser } from 'wxt/browser';
import { HandleManager, getDefaultIdpOrigin } from '@/lib/HandleManager';
import {
  savePushedAccounts,
  getPushedAccounts,
  normalizeIdpOrigin,
  type StoredAccount,
} from '@/lib/accountStorage';
import { isAtPassportOrigin } from '@/lib/fedcm-url';


export interface BackgroundMessagePayload {
  type: string;
  origin?: string;
  accounts?: StoredAccount[];
  configURL?: string;
  clientId?: string;
  accountId?: string;
}

export interface MessageSender {
  url?: string;
  tab?: {
    id?: number;
    url?: string;
  };
  origin?: string;
}

export interface BackgroundMessageResponse {
  success: boolean;
  accounts?: unknown[];
  token?: string;
  error?: string;
}

/**
 * Handles incoming runtime messages in the extension background script.
 */
export async function handleBackgroundMessage(
  message: BackgroundMessagePayload | null | undefined,
  sender: MessageSender
): Promise<BackgroundMessageResponse> {
  if (!message || typeof message.type !== 'string') {
    return { success: false, error: 'Invalid message' };
  }

  if (message.type === 'FETCH_ACCOUNTS') {
    try {
      const origin = normalizeIdpOrigin(message.origin || getDefaultIdpOrigin()) || getDefaultIdpOrigin();
      const accountsEndpoint = `${origin}/api/fedcm/accounts`;
      try {
        const response = await fetch(accountsEndpoint, {
          credentials: 'include',
          headers: {
            'X-AtPassport-FedCM': '1',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data?.accounts)) {
            const accounts = data.accounts.map((acc: { id?: string; name?: string; username?: string; picture?: string }) => ({
              handle: acc.username ? (acc.username.startsWith('@') ? acc.username : `@${acc.username}`) : `@${acc.name || ''}`,
              displayName: acc.name,
              avatar: acc.picture,
              did: acc.id,
            }));
            return { success: true, accounts };
          }
        }
      } catch {
        // Fallback to legacy handles endpoint
      }

      const endpoint = `${origin}/api/user/handles`;
      const manager = new HandleManager(endpoint);
      const accounts = await manager.fetchAccounts();
      return { success: true, accounts };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (message.type === 'SAVE_PUSHED_ACCOUNTS') {
    let rawSenderUrl = sender.url || sender.tab?.url || sender.origin;
    let senderOrigin: string | null = null;
    try {
      senderOrigin = rawSenderUrl ? new URL(rawSenderUrl).origin : null;
    } catch {
      // ignore
    }

    if (!senderOrigin && sender.tab?.id && typeof browser !== 'undefined' && browser.tabs?.get) {
      try {
        const tab = await browser.tabs.get(sender.tab.id);
        if (tab?.url) {
          senderOrigin = new URL(tab.url).origin;
        }
      } catch {
        // ignore
      }
    }

    if (!senderOrigin && sender.tab && message.origin && isAtPassportOrigin(message.origin)) {
      senderOrigin = message.origin;
    }

    console.log('[Background] SAVE_PUSHED_ACCOUNTS request received:', {
      messageOrigin: message.origin,
      senderOrigin,
      accountsCount: message.accounts?.length,
    });

    if (!senderOrigin || !isAtPassportOrigin(senderOrigin)) {
      console.warn('[Background] SAVE_PUSHED_ACCOUNTS rejected: Unauthorized sender origin:', senderOrigin);
      return { success: false, error: 'Unauthorized sender origin' };
    }

    const targetOrigin = normalizeIdpOrigin(message.origin || '');
    if (!targetOrigin || targetOrigin !== normalizeIdpOrigin(senderOrigin)) {
      console.warn('[Background] SAVE_PUSHED_ACCOUNTS rejected: Origin mismatch:', { targetOrigin, senderOrigin });
      return { success: false, error: 'Origin mismatch' };
    }

    try {
      await savePushedAccounts(targetOrigin, message.accounts || []);
      console.log('[Background] Successfully saved pushed accounts for:', targetOrigin, 'count:', message.accounts?.length);
      return { success: true };
    } catch (err) {
      console.error('[Background] Failed to save pushed accounts:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (message.type === 'GET_STORED_ACCOUNTS') {
    let origin = message.origin;
    if (!origin && message.configURL) {
      try {
        origin = new URL(message.configURL).origin;
      } catch {
        // ignore
      }
    }

    const normalized = normalizeIdpOrigin(origin || '');
    if (!normalized) {
      return { success: false, error: 'Invalid origin' };
    }

    try {
      const accounts = await getPushedAccounts(normalized);
      console.log('[Background] GET_STORED_ACCOUNTS for origin:', normalized, 'found accounts:', accounts.length);
      return { success: true, accounts };
    } catch (err) {
      console.error('[Background] Failed to get stored accounts:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (message.type === 'EXECUTE_ASSERTION') {
    try {
      const idpOrigin = normalizeIdpOrigin(message.origin || getDefaultIdpOrigin()) || getDefaultIdpOrigin();
      const assertionUrl = `${idpOrigin}/api/fedcm/assertion`;
      const formData = new URLSearchParams();
      formData.append('client_id', message.clientId || '');
      formData.append('account_id', message.accountId || '');

      console.log('[Background] Fetching assertion:', assertionUrl, 'clientId:', message.clientId);
      const response = await fetch(assertionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-AtPassport-FedCM': '1',
        },
        body: formData.toString(),
        credentials: 'include',
      });

      console.log('[Background] Assertion response status:', response.status);

      if (!response.ok) {
        let errorDetail = `Assertion failed with HTTP ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson?.error) {
            errorDetail = `${errJson.error}: ${errJson.error_description || ''}`;
          }
        } catch {
          // ignore
        }
        return { success: false, error: errorDetail };
      }

      const data = await response.json();
      if (!data?.token) {
        return { success: false, error: 'Missing token in assertion response' };
      }

      return { success: true, token: data.token };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return { success: false, error: `Unknown message type: ${message.type}` };
}
