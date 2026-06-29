import dynamic from 'next/dynamic';
import Head from 'next/head';
import Script from 'next/script';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import StorePage from '../components/StorePage';
import AccountPage from '../components/AccountPage';
import SeoHead from '../components/SeoHead';
import { seoNoIndex } from '../lib/seo';
import {
  ACCOUNT_CSS_HREF,
  ACCOUNT_CSS_ID,
  ensureAccountStylesheet,
} from '../lib/client/ensureAccountStylesheet';
import { getPublicSupabaseConfig } from '../lib/auth/publicSupabaseConfig';
const FastNav = dynamic(() => import('../components/FastNav'), { ssr: false });

const supabasePublicConfig = getPublicSupabaseConfig();

function isStoreRoute(pathname) {
  return (
    pathname === '/' ||
    pathname === '/new-arrivals' ||
    pathname === '/track-order' ||
    pathname === '/reviews' ||
    pathname.startsWith('/product/') ||
    pathname.startsWith('/category/')
  );
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isAdmin = router.pathname.startsWith('/admin');
  const isAccount = router.pathname.startsWith('/account');
  const useStoreShell =
    !isAdmin && !isAccount && isStoreRoute(router.pathname) && pageProps.bodyHtml;
  const useAccountShell =
    isAccount && pageProps.bodyHtml;

  const isAuthCallback = router.pathname === '/auth/callback';
  const showFastNav = !isAdmin && !isAuthCallback;

  useEffect(() => {
    if (isAccount) {
      document.body.classList.add('account-page');
      ensureAccountStylesheet();
      if (typeof window.syncAccountStickyOffset === 'function') {
        window.syncAccountStickyOffset();
      }
      return () => document.body.classList.remove('account-page');
    }
    document.body.classList.remove('account-page');
  }, [isAccount]);

  return (
    <>
      {!isAdmin ? (
        <Script
          src="/js/supabase.min.js?v=1"
          strategy="beforeInteractive"
          id="wn-supabase-lib"
        />
      ) : null}
      {!isAdmin && supabasePublicConfig.url && supabasePublicConfig.key ? (
        <Script
          id="wn-sb-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.__WN_SB__=${JSON.stringify(supabasePublicConfig)};`,
          }}
        />
      ) : null}
      {showFastNav ? <FastNav /> : null}
      {isAdmin ? (
        <Script src="/js/admin-common.js" strategy="beforeInteractive" />
      ) : null}
      {isAdmin ? (
        <>
          <SeoHead seo={seoNoIndex('Admin')} />
          <Head>
            <link
              href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Hind+Siliguri:wght@300;400;500;600;700&display=swap"
              rel="stylesheet"
            />
            <link rel="stylesheet" href="/css/admin.css?v=8" />
          </Head>
        </>
      ) : null}
      {isAccount ? (
        <>
          <SeoHead seo={seoNoIndex('আমার অ্যাকাউন্ট')} />
          <Head>
            <link
              id={ACCOUNT_CSS_ID}
              rel="stylesheet"
              href={ACCOUNT_CSS_HREF}
              key="account-dashboard-css"
            />
          </Head>
        </>
      ) : null}
      {useStoreShell ? (
        <>
          <Script src="/js/app.js?v=18" strategy="beforeInteractive" id="wn-store-app" />
          <StorePage pageProps={pageProps} />
        </>
      ) : useAccountShell ? (
        <AccountPage pageProps={pageProps} />
      ) : (
        <>
          <Component {...pageProps} />
          {isAdmin ? null : (
            <>
              {pageProps.inlineScripts ? (
                <Script
                  id="store-inline"
                  strategy="afterInteractive"
                  dangerouslySetInnerHTML={{ __html: pageProps.inlineScripts }}
                />
              ) : null}
              {pageProps.scriptSrcs?.map((src) => (
                <Script key={src} src={src} strategy="afterInteractive" />
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}
