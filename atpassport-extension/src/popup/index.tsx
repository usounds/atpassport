import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ClipboardCopy, Key, Loader2, AlertCircle, Copy, User } from 'lucide-react';

const Popup = () => {
  const [handles, setHandles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Fetch handles from AtPassport API
  useEffect(() => {
    const fetchHandles = async () => {
      try {
        setLoading(true);
        // We assume atpassport.net is the host for API. 
        // Note: fetch will include AtPassport session cookies because it's running within browser scope
        // with appropriate host permissions.
        const response = await fetch('https://atpassport.net/api/user/handles', {
          credentials: 'include',
        }); 
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(chrome.i18n.getMessage('loginRequired'));
          }
          throw new Error(`${chrome.i18n.getMessage('fetchError')} (${response.status})`);
        }
        const data = await response.json();
        setHandles(data.handles || []);
      } catch (err: any) {
        setError(err.message === 'Failed to fetch' ? chrome.i18n.getMessage('fetchError') : err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHandles();
  }, []);

  const handleSelect = async (handle: string) => {
    try {
      // Query for the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      // Try auto-filling via Content Script
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'autoFillHandle', 
        handle: handle 
      });

      if (response && response.success) {
        setCopyStatus(chrome.i18n.getMessage('filledSuccess'));
      } else {
        // Fallback: Copy to clipboard if injection failed
        await navigator.clipboard.writeText(handle);
        setCopyStatus(chrome.i18n.getMessage('copiedFallback'));
      }
    } catch (err) {
      // Fallback: Script might not be injectable (e.g., chrome:// or specialized pages)
      await navigator.clipboard.writeText(handle);
      setCopyStatus(chrome.i18n.getMessage('copiedIncompatible'));
    }

    // Auto-clear success status
    setTimeout(() => setCopyStatus(null), 3000);
  };

  const openAtPassport = () => {
    chrome.tabs.create({ url: 'https://atpassport.net/login' });
  };

  return (
    <div style={{ width: '300px', padding: '16px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
        <img src="/icons/icon48.png" alt="icon" style={{ width: '24px', height: '24px' }} />
        <h2 style={{ fontSize: '18px', margin: 0, color: '#333' }}>@passport</h2>
      </div>

      {loading && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto' }} color="#666" />
        </div>
      )}

      {error && (
        <div style={{ color: '#d32f2f', background: '#ffebee', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
          {error.includes(chrome.i18n.getMessage('loginRequired')) && (
            <button 
              onClick={openAtPassport}
              style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', marginTop: '8px', cursor: 'pointer', width: '100%', fontSize: '14px' }}
            >
              {chrome.i18n.getMessage('loginButton')}
            </button>
          )}
        </div>
      )}

      {!loading && !error && handles.length === 0 && (
        <div style={{ color: '#666', border: '1px dashed #ccc', padding: '16px', borderRadius: '8px', textAlign: 'center', fontSize: '14px' }}>
          {chrome.i18n.getMessage('noHandles')}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {handles.map((handle) => (
          <button
            key={handle}
            onClick={() => handleSelect(handle)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '12px', 
              background: '#f8f9fa', 
              border: '1px solid #e9ecef', 
              borderRadius: '8px',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 500,
              color: '#495057',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e9ecef'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f8f9fa'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} />
              {handle}
            </div>
            <Copy size={14} color="#adb5bd" />
          </button>
        ))}
      </div>

      {copyStatus && (
        <div style={{ position: 'fixed', bottom: '16px', left: '16px', right: '16px', padding: '8px', background: '#4caf50', color: 'white', borderRadius: '4px', textAlign: 'center', fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
          {copyStatus}
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
