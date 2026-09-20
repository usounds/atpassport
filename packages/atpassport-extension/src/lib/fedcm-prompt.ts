import type { AccountItem } from './HandleManager';

export interface PromptOptions {
  accounts: AccountItem[];
  iconUrl: string;
  rpDomain?: string;
  onSelect: (account: AccountItem) => void;
  onDismiss: () => void;
}

const STYLES = `
:host {
  all: initial;
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 2147483647;
  width: 320px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #f1f3f5;
  --text-primary: #212529;
  --text-secondary: #495057;
  --text-tertiary: #868e96;
  --accent: #0070f3;
  --accent-hover: #0060d0;
  --border-color: #e9ecef;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.2);
}

@media (prefers-color-scheme: dark) {
  :host {
    --bg-primary: #1a1b1e;
    --bg-secondary: #25262b;
    --bg-tertiary: #2c2e33;
    --text-primary: #e9ecef;
    --text-secondary: #adb5bd;
    --text-tertiary: #5c5f66;
    --accent: #339af0;
    --accent-hover: #4dabf7;
    --border-color: #373a40;
    --shadow: 0 8px 30px rgba(0, 0, 0, 0.35), 0 0 1px rgba(255, 255, 255, 0.1);
  }
}

.atp-card {
  width: 100%;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  padding: 14px;
  box-sizing: border-box;
  animation: atp-slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.atp-card.exiting {
  animation: atp-slideOut 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.atp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.atp-header-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.atp-back-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-tertiary);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.atp-back-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.atp-back-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.atp-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.atp-brand img {
  width: 22px;
  height: 22px;
  border-radius: 4px;
}

.atp-brand span {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
}

.atp-close-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-tertiary);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.atp-close-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.atp-close-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.atp-subtitle {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  margin-bottom: 10px;
  flex-shrink: 0;
}

.atp-confirm-body {
  display: flex;
  flex-direction: column;
  animation: atp-fadeIn 0.2s ease;
}

.atp-selected-account {
  display: flex;
  align-items: center;
  padding: 10px 4px;
  background-color: transparent;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  border-left: none;
  border-right: none;
  border-radius: 0;
  margin-bottom: 14px;
  gap: 12px;
}

.atp-disclosure {
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

.atp-disclosure strong {
  color: var(--text-primary);
  font-weight: 600;
}

.atp-confirm-btn {
  width: 100%;
  background-color: var(--accent);
  color: #ffffff;
  border: none;
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.atp-confirm-btn:hover {
  background-color: var(--accent-hover);
}

.atp-confirm-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.atp-confirm-btn:active {
  transform: scale(0.98);
}

@keyframes atp-fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.atp-account-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1 1 auto;
  min-height: 0;
  max-height: 280px;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
  touch-action: pan-y;
  -webkit-overflow-scrolling: touch;
  padding-right: 2px;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.atp-account-list::-webkit-scrollbar {
  width: 5px;
}

.atp-account-list::-webkit-scrollbar-track {
  background: transparent;
}

.atp-account-list::-webkit-scrollbar-thumb {
  background-color: var(--border-color);
  border-radius: 3px;
}

.atp-account-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 6px;
  background-color: transparent;
  border: none;
  border-bottom: 1px solid var(--border-color);
  border-radius: 0;
  cursor: pointer;
  transition: background-color 0.15s ease;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  flex-shrink: 0;
  min-height: 50px;
}

.atp-account-item:last-child {
  border-bottom: none;
}

.atp-account-item:hover {
  background-color: var(--bg-secondary);
}

.atp-account-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.atp-account-item:active {
  background-color: var(--bg-tertiary);
  transform: none;
}

.atp-account-content {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.atp-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
}

.atp-avatar-fallback {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--accent);
}

.atp-text-group {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.atp-display-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.atp-handle {
  font-size: 0.8rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.atp-handle.no-display-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.atp-action-arrow {
  color: var(--text-tertiary);
  flex-shrink: 0;
  margin-left: 8px;
}

.atp-footer {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
  text-align: center;
  flex-shrink: 0;
}

.atp-footer-link {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s;
}

.atp-footer-link:hover {
  color: var(--accent);
}

@keyframes atp-slideIn {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes atp-slideOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-12px);
  }
}
`;

const USER_SVG = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
  <circle cx="12" cy="7" r="4"></circle>
</svg>
`;

const CLOSE_SVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>
`;

const ARROW_SVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="9 18 15 12 9 6"></polyline>
</svg>
`;

const BACK_SVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <line x1="19" y1="12" x2="5" y2="12"></line>
  <polyline points="12 19 5 12 12 5"></polyline>
</svg>
`;

export function showFedCmPrompt(options: PromptOptions): () => void {
  // Remove existing container if any
  const existing = document.getElementById('atpassport-fedcm-host');
  if (existing) {
    existing.remove();
  }

  const rpDomain =
    options.rpDomain ||
    (typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'this site');

  const isJa = typeof navigator !== 'undefined' && navigator.language?.startsWith('ja');

  const i18n = {
    chooserSubtitle: isJa ? 'ハンドルを選択してログイン' : 'Sign in with your handle',
    confirmSubtitle: (domain: string) => (isJa ? `${domain} にログイン` : `Sign in to ${domain}`),
    disclosure: (domain: string) =>
      isJa
        ? `続行すると、@passport はあなたの名前とハンドルを <strong>${domain}</strong> と共有します。`
        : `To continue, @passport will share your name and handle with <strong>${domain}</strong>.`,
    continueBtn: (name: string) => (isJa ? `「${name}」として続行` : `Continue as ${name}`),
    backAria: isJa ? '戻る' : 'Back',
    closeAria: isJa ? '閉じる' : 'Close',
    learnMore: isJa ? '@passport について詳しく' : 'Learn more about @passport',
  };

  const host = document.createElement('div');
  host.id = 'atpassport-fedcm-host';
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.top = '16px';
  host.style.right = '16px';
  host.style.zIndex = '2147483647';
  host.style.width = '320px';
  host.style.maxWidth = 'calc(100vw - 32px)';
  host.style.maxHeight = 'calc(100vh - 32px)';
  host.style.display = 'block';
  host.style.pointerEvents = 'auto';
  const shadow = host.attachShadow({ mode: 'closed' });

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLES;
  shadow.appendChild(styleEl);

  const card = document.createElement('div');
  card.className = 'atp-card';

  let isDismissed = false;
  const dismiss = (notify = true) => {
    if (isDismissed) return;
    isDismissed = true;
    card.classList.add('exiting');
    setTimeout(() => {
      host.remove();
      window.removeEventListener('keydown', onKeyDown);
    }, 250);
    if (notify) {
      options.onDismiss();
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dismiss(true);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  const createFooter = () => {
    const footer = document.createElement('div');
    footer.className = 'atp-footer';
    const footerLink = document.createElement('a');
    footerLink.className = 'atp-footer-link';
    footerLink.textContent = i18n.learnMore;
    footerLink.href = 'https://atpassport.net';
    footerLink.target = '_blank';
    footer.appendChild(footerLink);
    return footer;
  };

  const createBrand = () => {
    const brand = document.createElement('div');
    brand.className = 'atp-brand';
    brand.innerHTML = `
      <img src="${options.iconUrl}" alt="@passport" />
      <span>@passport</span>
    `;
    return brand;
  };

  const createCloseBtn = () => {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'atp-close-btn';
    closeBtn.setAttribute('aria-label', i18n.closeAria);
    closeBtn.innerHTML = CLOSE_SVG;
    closeBtn.addEventListener('click', () => dismiss(true));
    return closeBtn;
  };

  const renderChooser = () => {
    card.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'atp-header';
    header.appendChild(createBrand());
    header.appendChild(createCloseBtn());
    card.appendChild(header);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.className = 'atp-subtitle';
    subtitle.textContent = i18n.chooserSubtitle;
    card.appendChild(subtitle);

    // Account List
    const list = document.createElement('div');
    list.className = 'atp-account-list';

    options.accounts.forEach((account) => {
      const item = document.createElement('button');
      item.className = 'atp-account-item';

      const content = document.createElement('div');
      content.className = 'atp-account-content';

      const formattedHandle = account.handle.startsWith('@') ? account.handle : `@${account.handle}`;

      let avatarHtml = '';
      if (account.avatar) {
        avatarHtml = `<img src="${account.avatar}" alt="" class="atp-avatar" />`;
      } else {
        avatarHtml = `<div class="atp-avatar-fallback">${USER_SVG}</div>`;
      }

      const textGroup = document.createElement('div');
      textGroup.className = 'atp-text-group';
      if (account.displayName) {
        const displayNameSpan = document.createElement('span');
        displayNameSpan.className = 'atp-display-name';
        displayNameSpan.textContent = account.displayName;
        textGroup.appendChild(displayNameSpan);
      }
      const handleSpan = document.createElement('span');
      handleSpan.className = `atp-handle ${!account.displayName ? 'no-display-name' : ''}`;
      handleSpan.textContent = formattedHandle;
      textGroup.appendChild(handleSpan);

      content.innerHTML = avatarHtml;
      const imgEl = content.querySelector('img');
      if (imgEl) {
        imgEl.addEventListener('error', () => {
          const fallback = document.createElement('div');
          fallback.className = 'atp-avatar-fallback';
          fallback.innerHTML = USER_SVG;
          imgEl.replaceWith(fallback);
        });
      }
      content.appendChild(textGroup);

      const arrow = document.createElement('div');
      arrow.className = 'atp-action-arrow';
      arrow.innerHTML = ARROW_SVG;

      item.appendChild(content);
      item.appendChild(arrow);

      item.addEventListener('click', () => {
        renderConfirm(account);
      });

      list.appendChild(item);
    });

    list.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    card.appendChild(list);

    card.appendChild(createFooter());
  };

  const renderConfirm = (account: AccountItem) => {
    card.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'atp-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'atp-header-left';

    if (options.accounts.length > 1) {
      const backBtn = document.createElement('button');
      backBtn.className = 'atp-back-btn';
      backBtn.setAttribute('aria-label', i18n.backAria);
      backBtn.innerHTML = BACK_SVG;
      backBtn.addEventListener('click', () => {
        renderChooser();
      });
      headerLeft.appendChild(backBtn);
    }

    headerLeft.appendChild(createBrand());
    header.appendChild(headerLeft);
    header.appendChild(createCloseBtn());
    card.appendChild(header);

    // Subtitle
    const subtitle = document.createElement('div');
    subtitle.className = 'atp-subtitle';
    subtitle.textContent = i18n.confirmSubtitle(rpDomain);
    card.appendChild(subtitle);

    // Body
    const body = document.createElement('div');
    body.className = 'atp-confirm-body';

    const selectedBox = document.createElement('div');
    selectedBox.className = 'atp-selected-account';

    const formattedHandle = account.handle.startsWith('@') ? account.handle : `@${account.handle}`;

    let avatarHtml = '';
    if (account.avatar) {
      avatarHtml = `<img src="${account.avatar}" alt="" class="atp-avatar" />`;
    } else {
      avatarHtml = `<div class="atp-avatar-fallback">${USER_SVG}</div>`;
    }

    const textGroup = document.createElement('div');
    textGroup.className = 'atp-text-group';
    if (account.displayName) {
      const displayNameSpan = document.createElement('span');
      displayNameSpan.className = 'atp-display-name';
      displayNameSpan.textContent = account.displayName;
      textGroup.appendChild(displayNameSpan);
    }
    const handleSpan = document.createElement('span');
    handleSpan.className = `atp-handle ${!account.displayName ? 'no-display-name' : ''}`;
    handleSpan.textContent = formattedHandle;
    textGroup.appendChild(handleSpan);

    selectedBox.innerHTML = avatarHtml;
    const imgEl = selectedBox.querySelector('img');
    if (imgEl) {
      imgEl.addEventListener('error', () => {
        const fallback = document.createElement('div');
        fallback.className = 'atp-avatar-fallback';
        fallback.innerHTML = USER_SVG;
        imgEl.replaceWith(fallback);
      });
    }
    selectedBox.appendChild(textGroup);
    body.appendChild(selectedBox);

    // Disclosure
    const disclosure = document.createElement('div');
    disclosure.className = 'atp-disclosure';
    disclosure.innerHTML = i18n.disclosure(rpDomain);
    body.appendChild(disclosure);

    // Primary Confirm Button
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'atp-confirm-btn';
    confirmBtn.textContent = i18n.continueBtn(account.displayName || formattedHandle);
    confirmBtn.addEventListener('click', () => {
      dismiss(false);
      options.onSelect(account);
    });
    body.appendChild(confirmBtn);

    card.appendChild(body);

    setTimeout(() => {
      confirmBtn.focus();
    }, 50);
  };

  if (options.accounts.length === 1) {
    renderConfirm(options.accounts[0]);
  } else {
    renderChooser();
  }

  shadow.appendChild(card);
  (document.body || document.documentElement).appendChild(host);

  return () => dismiss(false);
}
