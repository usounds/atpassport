import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Loader2, AlertCircle, Copy, User, CheckCircle } from 'lucide-react';
import { HandleManager } from '@/lib/HandleManager';
import './popup.css';

export const Popup = () => {
  const manager = useMemo(() => new HandleManager(), []);
  const [handles, setHandles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [toastExiting, setToastExiting] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch handles from AtPassport API
  useEffect(() => {
    const fetchHandles = async () => {
      const startTime = Date.now();
      try {
        setLoading(true);
        const result = await manager.fetchHandles();
        setHandles(result);
      } catch (err) {
        if (err instanceof Error && err.message === 'loginRequired') {
          setError(chrome.i18n.getMessage('loginRequired'));
        } else if (err instanceof Error && err.message === 'fetchError') {
          setError(chrome.i18n.getMessage('fetchError'));
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
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
  }, [manager]);

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

  const isLoginError = error === chrome.i18n.getMessage('loginRequired');

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

      {loading && !error && (
        <div className="loading-container">
          <Loader2 className="spinner" size={32} />
          <div className="loading-text">
            {chrome.i18n.getMessage('processing')}
          </div>
        </div>
      )}

      {error && (
        <div 
          className={`error-box ${isLoginError ? 'clickable' : ''}`}
          onClick={() => isLoginError ? openAtPassport() : null}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && handles.length === 0 && (
        <div className="empty-state">
          {chrome.i18n.getMessage('noHandles')}
        </div>
      )}

      {!loading && !error && handles.length > 0 && (
        <div className="handle-list">
          {handles.map((handle, index) => (
            <button
              key={handle}
              className={`handle-item stagger-${Math.min(index + 1, 5)}`}
              onClick={() => handleSelect(handle)}
            >
              <div className="handle-content">
                <User className="handle-icon" size={18} />
                <span className="handle-text">{handle}</span>
              </div>
              <Copy className="copy-icon" size={16} />
            </button>
          ))}
        </div>
      )}

      {!loading && !error && (
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

