import { browser } from 'wxt/browser';
import { HandleManager, getDefaultIdpOrigin } from '@/lib/HandleManager';
import {
  savePushedAccounts,
  getPushedAccounts,
  clearPushedAccounts,
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
    cookieStoreId?: string;
    incognito?: boolean;
  };
  origin?: string;
}

export interface BackgroundMessageResponse {
  success: boolean;
  accounts?: unknown[];
  token?: string;
  error?: string;
}

function getSenderContext(sender: MessageSender): { isPrivate: boolean; contextKey: string } {
  const isPrivate = Boolean(
    sender.tab?.incognito ||
    sender.tab?.cookieStoreId === 'firefox-private' ||
    sender.tab?.cookieStoreId?.includes('private')
  );
  const contextKey = sender.tab?.cookieStoreId || 'firefox-default';
  return { isPrivate, contextKey };
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
    const { isPrivate, contextKey } = getSenderContext(sender);
    if (isPrivate) {
      console.warn('[Background] SAVE_PUSHED_ACCOUNTS rejected: Private browsing context not supported for account storage');
      return { success: false, error: 'Private browsing context is not supported for account storage' };
    }

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
      contextKey,
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
      await savePushedAccounts(targetOrigin, message.accounts || [], contextKey);
      console.log('[Background] Successfully saved pushed accounts for:', targetOrigin, 'context:', contextKey, 'count:', message.accounts?.length);
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
    const { isPrivate, contextKey } = getSenderContext(sender);
    if (isPrivate) {
      console.log('[Background] GET_STORED_ACCOUNTS: Returning empty accounts in private browsing context');
      return { success: true, accounts: [] };
    }

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
      const accounts = await getPushedAccounts(normalized, contextKey);
      console.log('[Background] GET_STORED_ACCOUNTS for origin:', normalized, 'context:', contextKey, 'found accounts:', accounts.length);
      return { success: true, accounts };
    } catch (err) {
      console.error('[Background] Failed to get stored accounts:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (message.type === 'CLEAR_STORED_ACCOUNTS') {
    const { isPrivate, contextKey } = getSenderContext(sender);
    if (isPrivate) {
      return { success: true };
    }

    const normalized = normalizeIdpOrigin(message.origin || '');
    if (!normalized) {
      return { success: false, error: 'Invalid origin' };
    }

    try {
      await clearPushedAccounts(normalized, contextKey);
      console.log('[Background] CLEAR_STORED_ACCOUNTS for origin:', normalized, 'context:', contextKey);
      return { success: true };
    } catch (err) {
      console.error('[Background] Failed to clear stored accounts:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return { success: false, error: `Unknown message type: ${message.type}` };
}
