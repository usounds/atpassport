import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle, Copy, User } from 'lucide-react';
import { HandleManager } from '@/lib/HandleManager';

export const Popup = () => {
  const manager = useMemo(() => new HandleManager(), []);
  const [handles, setHandles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

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
  }, [manager]);

  const handleSelect = async (handle: string) => {
    try {
      const statusKey = await manager.applyHandle(handle);
      setCopyStatus(chrome.i18n.getMessage(statusKey));
    } catch {
      setCopyStatus(chrome.i18n.getMessage('copiedIncompatible'));
    }

    // Auto-clear success status
    setTimeout(() => setCopyStatus(null), 3000);
  };

  const openAtPassport = () => {
    chrome.tabs.create({ url: 'https://atpassport.net' });
  };

  return (
    <div style={{ width: '300px', padding: '16px', fontFamily: 'sans-serif' }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
      <div 
        onClick={() => chrome.tabs.create({ url: 'https://atpassport.net' })}
        onMouseOver={(e) => e.currentTarget.style.opacity = '0.7'}
        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '8px', cursor: 'pointer', transition: 'opacity 0.2s' }}
        title="Go to atpassport.net"
      >
        <img src="/icons/icon48.png" alt="icon" style={{ width: '24px', height: '24px' }} />
        <h2 style={{ fontSize: '18px', margin: 0, color: '#333' }}>@passport</h2>
      </div>

      {loading && !error && (
        <div style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Loader2 className="animate-spin" color="#666" />
          <div style={{ fontSize: '14px', color: '#666' }}>
            {chrome.i18n.getMessage('processing')}
          </div>
        </div>
      )}

      {error && (
        <div 
          onClick={() => error.includes(chrome.i18n.getMessage('loginRequired')) ? openAtPassport() : null}
          style={{ 
            color: '#d32f2f', background: '#ffebee', padding: '10px', borderRadius: '4px', marginBottom: '12px', fontSize: '14px',
            cursor: error.includes(chrome.i18n.getMessage('loginRequired')) ? 'pointer' : 'default',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => {
            if (error.includes(chrome.i18n.getMessage('loginRequired'))) {
              e.currentTarget.style.background = '#ffd8d8';
            }
          }}
          onMouseOut={(e) => {
            if (error.includes(chrome.i18n.getMessage('loginRequired'))) {
              e.currentTarget.style.background = '#ffebee';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            <span style={{ textDecoration: 'none' }}>
              {error}
            </span>
          </div>
        </div>
      )}

      {!loading && !error && handles.length === 0 && (
        <div style={{ color: '#666', border: '1px dashed #ccc', padding: '16px', borderRadius: '8px', textAlign: 'center', fontSize: '14px' }}>
          {chrome.i18n.getMessage('noHandles')}
        </div>
      )}

      {!loading && !error && handles.length > 0 && (
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
      )}

      {!loading && !error && (
        <div 
          onClick={openAtPassport}
          style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: '#888', 
            textAlign: 'center',
            cursor: 'pointer'
          }}
        >
          {chrome.i18n.getMessage('footerNote')}
        </div>
      )}

      {copyStatus && (
        <div style={{ 
          position: 'fixed', bottom: '16px', left: '16px', right: '16px', 
          padding: '8px', 
          background: '#4caf50', 
          color: 'white', 
          borderRadius: '4px', 
          textAlign: 'center', 
          fontSize: '12px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          {copyStatus}
        </div>
      )}
    </div>
  );
};

export default Popup;
