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
 * after client-side transitions or locale changes and ensures iframes
 * have accessible titles for screen readers.
 */
export function BlueskyEmbedManager() {
  const locale = useLocale();

  useEffect(() => {
    // Function to add missing titles to Bluesky (and other) iframes for accessibility
    const addIframeTitles = () => {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        if (!iframe.getAttribute('title')) {
          // Identify Bluesky iframes
          if (iframe.src.includes('bsky.app') || iframe.src.includes('bluesky')) {
            iframe.setAttribute('title', locale === 'ja' ? 'Blueskyの埋め込み投稿' : 'Bluesky post embed');
          } else {
            iframe.setAttribute('title', locale === 'ja' ? '外部コンテンツの埋め込み' : 'Embedded content');
          }
        }
      });
    };

    // Run immediately to catch any already rendered iframes
    addIframeTitles();

    // Small delay to allow Next.js to complete DOM patching after locale change
    const timer = setTimeout(() => {
      if (window.bluesky && typeof window.bluesky.scan === 'function') {
        try {
          window.bluesky.scan();
          // Scan completes asynchronously; run again shortly after scan
          setTimeout(addIframeTitles, 500);
        } catch (e) {
          console.error('Failed to scan Bluesky embeds:', e);
        }
      }
    }, 100);

    // Set up a MutationObserver to watch for newly added iframe nodes (by embed.js)
    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node instanceof HTMLElement && (node.tagName === 'IFRAME' || node.querySelector('iframe'))) {
              shouldCheck = true;
              break;
            }
          }
        }
        if (shouldCheck) break;
      }
      if (shouldCheck) {
        addIframeTitles();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [locale]);

  return null;
}

