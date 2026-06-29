'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { ensureAccountStylesheet } from '../lib/client/ensureAccountStylesheet';

const CACHE_PREFIX = 'wn_account_v1:';
const CACHE_TTL_MS = 2 * 60 * 1000;
const ACCOUNT_PATH = '/account';

export function readAccountCache(path = ACCOUNT_PATH) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + path);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_PREFIX + path);
      return null;
    }
    return entry.props;
  } catch {
    return null;
  }
}

export function writeAccountCache(path, props) {
  if (typeof window === 'undefined' || !props?.bodyHtml) return;
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + (path || ACCOUNT_PATH),
      JSON.stringify({ ts: Date.now(), props })
    );
  } catch {
    /* quota */
  }
}

function runInlineAccountScript(inline) {
  if (!inline?.trim()) return;
  try {
    new Function(inline)();
  } catch {
    /* ignore */
  }
}

function refreshDashboard() {
  if (typeof window.refreshAccountDashboard === 'function') {
    window.refreshAccountDashboard();
  }
}

export default function AccountPage({ pageProps }) {
  const router = useRouter();
  const [live, setLive] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = readAccountCache(ACCOUNT_PATH);
      if (cached?.bodyHtml) return cached;
    }
    return pageProps;
  });

  useEffect(() => {
    ensureAccountStylesheet();
  }, []);

  useEffect(() => {
    const onFast = (e) => {
      if (e.detail?.bodyHtml) {
        ensureAccountStylesheet();
        setLive(e.detail);
      }
    };
    window.addEventListener('wn:fast-account', onFast);
    return () => window.removeEventListener('wn:fast-account', onFast);
  }, []);

  useEffect(() => {
    if (!pageProps?.bodyHtml) return;
    setLive(pageProps);
    writeAccountCache(ACCOUNT_PATH, pageProps);
  }, [pageProps]);

  useEffect(() => {
    if (!live?.bodyHtml) return;
    runInlineAccountScript(live.inlineScripts);
    refreshDashboard();
  }, [live.bodyHtml, live.inlineScripts]);

  const { bodyHtml, inlineScripts, scriptSrcs } = live;
  const contentKey = `${router.asPath}-${bodyHtml?.length || 0}`;

  return (
    <>
      <div
        id="accountPageContent"
        key={contentKey}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: bodyHtml || '' }}
      />
      {inlineScripts ? (
        <Script
          key={`account-inline-${contentKey}`}
          id="account-inline"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: inlineScripts }}
        />
      ) : null}
      {scriptSrcs
        ?.filter((src) => src !== '/js/app.js')
        .map((src) => (
          <Script
            key={`${contentKey}-${src}`}
            src={src}
            strategy="afterInteractive"
            onLoad={refreshDashboard}
          />
        ))}
      <Script src="/js/app.js?v=18" strategy="beforeInteractive" id="wn-store-app-account" />
    </>
  );
}
