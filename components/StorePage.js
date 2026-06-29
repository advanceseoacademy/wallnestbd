'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import SeoHead from './SeoHead';

const CACHE_PREFIX = 'wn_page_v5:';
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
          seo: props.seo || null,
          siteUrl: props.siteUrl || '',
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
  if (typeof window.patchHeaderAuth === 'function') {
    window.patchHeaderAuth(data.user);
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

function initialStoreProps(pageProps, asPath) {
  if (typeof window === 'undefined') return pageProps;
  const cached = readPageCache((asPath || window.location.pathname).split('?')[0]);
  if (cached?.bodyHtml) return { ...pageProps, ...cached };
  return pageProps;
}

export default function StorePage({ pageProps }) {
  const router = useRouter();
  const [live, setLive] = useState(() =>
    initialStoreProps(pageProps, router.asPath)
  );

  useEffect(() => {
    if (!pageProps?.bodyHtml) return;
    setLive(pageProps);
    if (router.asPath) {
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

  useEffect(() => {
    if (typeof window.initProductPage === 'function' && window.__PRODUCT_PAGE__) {
      window.initProductPage();
    }
    if (typeof window.initTrackOrderPage === 'function') {
      window.initTrackOrderPage();
    }
  }, [live.bodyHtml, live.inlineScripts]);

  const { bodyHtml, inlineScripts, scriptSrcs, seo, siteUrl } = live;
  const isProductPage = router.pathname.startsWith('/product/');
  const inlineStrategy = isProductPage ? 'beforeInteractive' : 'afterInteractive';

  return (
    <>
      <SeoHead seo={seo} baseUrl={siteUrl} />
      <div
        id="storePageContent"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: bodyHtml || '' }}
      />
      {inlineScripts ? (
        <Script
          key={`inline-${router.asPath}-${inlineScripts.length}`}
          id={`store-inline-${router.asPath.replace(/[^a-z0-9]+/gi, '-')}`}
          strategy={inlineStrategy}
          dangerouslySetInnerHTML={{ __html: inlineScripts }}
        />
      ) : null}
      {scriptSrcs
        ?.filter((src) => src !== '/js/app.js')
        .map((src) => (
          <Script key={`${router.asPath}-${src}`} src={src} strategy="afterInteractive" />
        ))}
    </>
  );
}
