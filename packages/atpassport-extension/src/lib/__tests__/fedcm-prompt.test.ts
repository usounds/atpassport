import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showFedCmPrompt } from '../fedcm-prompt';

describe('fedcm-prompt', () => {
  let lastShadowRoot: ShadowRoot | null = null;
  const origAttachShadow = Element.prototype.attachShadow;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    lastShadowRoot = null;
    vi.spyOn(Element.prototype, 'attachShadow').mockImplementation(function (this: HTMLElement, init: ShadowRootInit) {
      const root = origAttachShadow.call(this, { ...init, mode: 'open' });
      lastShadowRoot = root;
      return root;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('renders prompt card with multiple accounts in chooser view and transitions to confirm view', () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();

    const accounts = [
      {
        handle: 'alice.test',
        displayName: 'Alice In Wonderland',
        avatar: 'https://example.com/alice.png',
        did: 'did:plc:alice',
      },
      {
        handle: 'bob.test',
      },
    ];

    const cleanup = showFedCmPrompt({
      accounts,
      iconUrl: 'chrome-extension://id/icons/icon48.png',
      rpDomain: 'skyblur.uk',
      onSelect,
      onDismiss,
    });

    const host = document.getElementById('atpassport-fedcm-host');
    expect(host).not.toBeNull();
    expect(lastShadowRoot).not.toBeNull();

    // In chooser view, account items and footer should be present
    const accountItems = lastShadowRoot!.querySelectorAll('.atp-account-item');
    expect(accountItems.length).toBe(2);
    expect(lastShadowRoot!.querySelector('.atp-footer')).not.toBeNull();

    // Click on Alice
    (accountItems[0] as HTMLButtonElement).click();

    // Should now be in confirmation view (footer should NOT be present)
    const confirmBtn = lastShadowRoot!.querySelector('.atp-confirm-btn') as HTMLButtonElement;
    expect(confirmBtn).not.toBeNull();
    const backBtn = lastShadowRoot!.querySelector('.atp-back-btn') as HTMLButtonElement;
    expect(backBtn).not.toBeNull();
    expect(lastShadowRoot!.querySelector('.atp-footer')).toBeNull();

    // Click back button to return to chooser
    backBtn.click();
    expect(lastShadowRoot!.querySelectorAll('.atp-account-item').length).toBe(2);

    // Click Bob and confirm
    const updatedItems = lastShadowRoot!.querySelectorAll('.atp-account-item');
    (updatedItems[1] as HTMLButtonElement).click();

    const bobConfirmBtn = lastShadowRoot!.querySelector('.atp-confirm-btn') as HTMLButtonElement;
    expect(bobConfirmBtn).not.toBeNull();
    bobConfirmBtn.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(accounts[1]);
    expect(onDismiss).not.toHaveBeenCalled();

    cleanup();
  });

  it('directly shows confirmation view for single account and calls onSelect on confirm', () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();

    const account = {
      handle: 'alice.test',
      displayName: 'Alice',
      avatar: 'https://example.com/alice.png',
    };

    const cleanup = showFedCmPrompt({
      accounts: [account],
      iconUrl: 'chrome-extension://id/icons/icon48.png',
      rpDomain: 'skyblur.uk',
      onSelect,
      onDismiss,
    });

    expect(lastShadowRoot).not.toBeNull();

    // For single account, confirmation view is shown directly without back button
    const backBtn = lastShadowRoot!.querySelector('.atp-back-btn');
    expect(backBtn).toBeNull();

    const confirmBtn = lastShadowRoot!.querySelector('.atp-confirm-btn') as HTMLButtonElement;
    expect(confirmBtn).not.toBeNull();

    // Click confirm button
    confirmBtn.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(account);
    expect(onDismiss).not.toHaveBeenCalled();

    cleanup();
  });

  it('handles close button to dismiss prompt', () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();

    showFedCmPrompt({
      accounts: [{ handle: 'test.handle' }],
      iconUrl: 'chrome-extension://id/icons/icon48.png',
      onSelect,
      onDismiss,
    });

    const closeBtn = lastShadowRoot!.querySelector('.atp-close-btn') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();

    expect(onDismiss).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    expect(document.getElementById('atpassport-fedcm-host')).toBeNull();
  });

  it('handles Escape key to dismiss prompt', () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();

    showFedCmPrompt({
      accounts: [{ handle: 'test.handle' }],
      iconUrl: 'chrome-extension://id/icons/icon48.png',
      onSelect,
      onDismiss,
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    expect(document.getElementById('atpassport-fedcm-host')).toBeNull();
  });
});
