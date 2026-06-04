'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';

const CACHE_PREFIX = 'wn_page_v1:';
const CACHE_TTL_MS = 3 * 60 * 1000;

export function readPageCache(path) {
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

export function writePageCache(path, props) {
  if (typeof window === 'undefined' || !props?.bodyHtml) return;
  try {
    sessionStorage.setItem(
      CACHE_PREFIX + path,
      JSON.stringify({
        ts: Date.now(),
        props: {
          bodyHtml: props.bodyHtml,
          inlineScripts: props.inlineScripts || '',
          scriptSrcs: props.scriptSrcs || [],
        },
      })
    );
  } catch {
    /* quota */
  }
}

export function patchNavFromApi(data) {
  const el = document.getElementById('cartCount');
  if (el && typeof data.cartCount === 'number') {
    el.textContent = String(data.cartCount);
  }
}

export async function refreshNavContext() {
  try {
    const res = await fetch('/api/nav-context', { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    patchNavFromApi(data);
  } catch {
    /* ignore */
  }
}

export default function StorePage({ pageProps }) {
  const router = useRouter();
  const [live, setLive] = useState(pageProps);

  useEffect(() => {
    setLive(pageProps);
    if (pageProps.bodyHtml && router.asPath) {
      writePageCache(router.asPath, pageProps);
    }
  }, [pageProps, router.asPath]);

  useEffect(() => {
    const onFast = (e) => {
      if (e.detail?.bodyHtml) setLive(e.detail);
    };
    window.addEventListener('wn:fast-page', onFast);
    return () => window.removeEventListener('wn:fast-page', onFast);
  }, []);

  useEffect(() => {
    refreshNavContext();
  }, [live.bodyHtml]);

  const { bodyHtml, inlineScripts, scriptSrcs } = live;

  return (
    <>
      <div
        key={bodyHtml?.slice(0, 80)}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: bodyHtml || '' }}
      />
      {inlineScripts ? (
        <Script
          id="store-inline-live"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: inlineScripts }}
        />
      ) : null}
      {scriptSrcs?.map((src) => (
        <Script key={`live-${src}`} src={src} strategy="afterInteractive" />
      ))}
    </>
  );
}
