import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, AlertCircle, Copy, User, CheckCircle, RefreshCw } from 'lucide-react';
import { HandleManager, type AccountItem } from '@/lib/HandleManager';
import './popup.css';

interface ErrorState {
  message: string;
  isLogin: boolean;
}

export const Popup = () => {
  const manager = useMemo(() => new HandleManager(), []);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [toastExiting, setToastExiting] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatError = (err: unknown): ErrorState => {
    if (!(err instanceof Error)) {
      return { message: String(err), isLogin: false };
    }
    const code = err.message;
    if (code === 'loginRequired') {
      return { message: chrome.i18n.getMessage('loginRequired'), isLogin: true };
    }
    if (code === 'networkError') {
      return {
        message: chrome.i18n.getMessage('networkError') || 'Network error',
        isLogin: false,
      };
    }
    if (code === 'rateLimited') {
      return {
        message: chrome.i18n.getMessage('rateLimited') || 'Too many requests',
        isLogin: false,
      };
    }
    if (code === 'invalidResponse') {
      return {
        message: chrome.i18n.getMessage('invalidResponse') || 'Invalid response',
        isLogin: false,
      };
    }
    if (code.startsWith('serverError_')) {
      const status = code.replace('serverError_', '');
      const localized = chrome.i18n.getMessage('serverError', [status]);
      return { message: localized || `Server error (${status})`, isLogin: false };
    }
    if (code.startsWith('httpError_')) {
      const status = code.replace('httpError_', '');
      const localized = chrome.i18n.getMessage('httpError', [status]);
      return { message: localized || `HTTP error (${status})`, isLogin: false };
    }
    const localized = chrome.i18n.getMessage(code);
    return { message: localized || code, isLogin: false };
  };

  // Fetch handles from AtPassport API
  useEffect(() => {
    const fetchHandles = async () => {
      const startTime = Date.now();
      try {
        setLoading(true);
        setErrorState(null);
        const result = await manager.fetchAccounts();
        setAccounts(result);
      } catch (err) {
        setErrorState(formatError(err));
      } finally {
        const elapsed = Date.now() - startTime;
        if (elapsed < 500) {
          await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
        }
        setLoading(false);
      }
    };

    fetchHandles();

    // Cleanup timeouts on unmount
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    };
  }, [manager, reloadTrigger]);

  const handleSelect = async (handle: string) => {
    // Clear existing timeouts to prevent animation conflicts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);

    try {
      const statusKey = await manager.applyHandle(handle);
      setCopyStatus(chrome.i18n.getMessage(statusKey));
      setToastExiting(false);
      setToastKey(prev => prev + 1);

      // Auto-clear success status with animation
      timeoutRef.current = setTimeout(() => {
        setToastExiting(true);
        exitTimeoutRef.current = setTimeout(() => {
          setCopyStatus(null);
          setToastExiting(false);
          timeoutRef.current = null;
          exitTimeoutRef.current = null;
        }, 300); // match animation duration
      }, 2700);
    } catch {
      setCopyStatus(chrome.i18n.getMessage('copiedIncompatible'));
    }
  };

  const openAtPassport = () => {
    chrome.tabs.create({ url: 'https://atpassport.net' });
  };

  return (
    <div className="popup-container">
      <div 
        className="header"
        onClick={openAtPassport}
        title="Go to atpassport.net"
      >
        <img src="/icons/icon48.png" alt="icon" />
        <h2>@passport</h2>
      </div>

      {loading && !errorState && (
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <div className="loading-text">
            {chrome.i18n.getMessage('processing')}
          </div>
        </div>
      )}

      {errorState && (
        <div 
          className={`error-box ${errorState.isLogin ? 'clickable' : ''}`}
          onClick={() => errorState.isLogin ? openAtPassport() : null}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div className="error-content">
            <span className="error-message">{errorState.message}</span>
            {!errorState.isLogin && (
              <button
                type="button"
                className="retry-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReloadTrigger(prev => prev + 1);
                }}
              >
                <RefreshCw size={13} />
                <span>{chrome.i18n.getMessage('retry') || 'Retry'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && !errorState && accounts.length === 0 && (
        <div className="empty-state">
          {chrome.i18n.getMessage('noHandles')}
        </div>
      )}

      {!loading && !errorState && accounts.length > 0 && (
        <div className="handle-list" onWheel={(e) => e.stopPropagation()}>
          {accounts.map((account, index) => {
            const formattedHandle = account.handle.startsWith('@')
              ? account.handle
              : `@${account.handle}`;

            return (
              <button
                key={account.handle}
                className={`handle-item stagger-${Math.min(index + 1, 5)}`}
                onClick={() => handleSelect(account.handle.replace(/^@/, ''))}
              >
                <div className="handle-content">
                  {account.avatar ? (
                    <img
                      src={account.avatar}
                      alt=""
                      className="handle-avatar"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="handle-avatar-fallback"
                    style={{ display: account.avatar ? 'none' : 'flex' }}
                  >
                    <User className="handle-icon" size={18} />
                  </div>
                  <div className="handle-text-group">
                    {account.displayName ? (
                      <span className="handle-display-name">{account.displayName}</span>
                    ) : null}
                    <span
                      className={`handle-text ${!account.displayName ? 'no-display-name' : ''}`}
                    >
                      {formattedHandle}
                    </span>
                  </div>
                </div>
                <Copy className="copy-icon" size={16} />
              </button>
            );
          })}
        </div>
      )}

      {!loading && !errorState && (
        <div className="footer">
          <span className="footer-link" onClick={openAtPassport}>
            {chrome.i18n.getMessage('footerNote')}
          </span>
        </div>
      )}

      {copyStatus && (
        <div key={toastKey} className={`toast ${toastExiting ? 'exiting' : ''}`}>
          <CheckCircle size={16} />
          {copyStatus}
        </div>
      )}
    </div>
  );
};

export default Popup;

