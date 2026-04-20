'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';

declare global {
  interface Window {
    bluesky?: {
      scan: () => void;
    };
  }
}

/**
 * BlueskyEmbedManager handles re-scanning the DOM for Bluesky embeds
 * after client-side transitions or locale changes.
 */
export function BlueskyEmbedManager() {
  const locale = useLocale();

  useEffect(() => {
    // Small delay to allow Next.js to complete DOM patching after locale change
    const timer = setTimeout(() => {
      if (window.bluesky && typeof window.bluesky.scan === 'function') {
        try {
          window.bluesky.scan();
        } catch (e) {
          console.error('Failed to scan Bluesky embeds:', e);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [locale]);

  return null;
}
