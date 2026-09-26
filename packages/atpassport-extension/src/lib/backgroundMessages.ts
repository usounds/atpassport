import { prepareAssertionRule, releaseAssertionRule } from './fedcmHeaderRule';
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
  ruleId?: number;
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
  frameId?: number;
}

export interface BackgroundMessageResponse {
  success: boolean;
  accounts?: unknown[];
  token?: string;
  assertionUrl?: string;
  ruleId?: number;
  error?: string;
}

function getSenderContext(sender: MessageSender): { isPrivate: boolean; contextKey: string; unknownContext: boolean } {
  const isPrivate = Boolean(
    sender.tab?.incognito ||
    sender.tab?.cookieStoreId === 'firefox-private' ||
    sender.tab?.cookieStoreId?.includes('private')
  );
  const contextKey = sender.tab?.cookieStoreId || 'firefox-default';
  return { isPrivate, contextKey, unknownContext: Boolean(sender.tab && !sender.tab.cookieStoreId) };
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

  if (message.type === 'PREPARE_ASSERTION' || message.type === 'RELEASE_ASSERTION') {
    const { isPrivate, unknownContext } = getSenderContext(sender);
    const tabId = sender.tab?.id;
    if (isPrivate || unknownContext || tabId === undefined || sender.frameId !== 0 || !sender.url) {
      return { success: false, error: 'Unsupported assertion context' };
    }
    try {
      const rp = new URL(sender.url);
      if (rp.protocol !== 'https:' && !(rp.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(rp.hostname))) {
        throw new Error('Invalid RP origin');
      }
      if (message.type === 'RELEASE_ASSERTION') {
        if (typeof message.ruleId !== 'number') throw new Error('Invalid rule');
        await releaseAssertionRule(message.ruleId, tabId);
        return { success: true };
      }
      const origin = normalizeIdpOrigin(message.origin || '');
      if (!origin || !isAtPassportOrigin(origin)) throw new Error('Invalid IdP');
      return { success: true, ...await prepareAssertionRule(origin, tabId) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  if (message.type === 'FETCH_ACCOUNTS') {
    const { isPrivate, contextKey, unknownContext } = getSenderContext(sender);
    if (isPrivate || unknownContext || contextKey !== 'firefox-default') {
      return { success: false, error: 'Open AtPassport in this context to synchronize accounts' };
    }
    try {
      const origin = normalizeIdpOrigin(message.origin || getDefaultIdpOrigin());
      if (!origin || !isAtPassportOrigin(origin)) throw new Error('Invalid origin');
      // Legacy default-context only. Never grant a FedCM header to list requests.
      const accounts = await new HandleManager(`${origin}/api/user/handles`).fetchAccounts();
      return { success: true, accounts };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  if (message.type === 'SAVE_PUSHED_ACCOUNTS') {
    const { isPrivate, contextKey, unknownContext } = getSenderContext(sender);
    if (isPrivate || unknownContext) {
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
    const { isPrivate, contextKey, unknownContext } = getSenderContext(sender);
    if (isPrivate || unknownContext) {
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
    const { isPrivate, contextKey, unknownContext } = getSenderContext(sender);
    if (isPrivate || unknownContext) {
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
