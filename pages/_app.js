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
import {
  OFFER_MS_CSS_HREF,
  OFFER_MS_CSS_ID,
  ensureOfferMotionSensorStylesheet,
} from '../lib/client/ensureOfferStylesheet';
import { getPublicSupabaseConfig } from '../lib/auth/publicSupabaseConfig';
const FastNav = dynamic(() => import('../components/FastNav'), { ssr: false });

const supabasePublicConfig = getPublicSupabaseConfig();

function isStoreRoute(pathname) {
  return (
    pathname === '/' ||
    pathname === '/new-arrivals' ||
    pathname === '/track-order' ||
    pathname === '/checkout' ||
    pathname === '/cart' ||
    pathname === '/reviews' ||
    pathname === '/offer/motion-sensor-light' ||
    pathname === '/offer/motion-sensor-light/thank-you' ||
    pathname.startsWith('/product/') ||
    pathname.startsWith('/category/')
  );
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isAdmin = router.pathname.startsWith('/admin');
  const isAccount = router.pathname.startsWith('/account');
  const isOfferMotion =
    router.pathname === '/offer/motion-sensor-light' ||
    router.pathname === '/offer/motion-sensor-light/thank-you';
  const useStoreShell =
    !isAdmin && !isAccount && isStoreRoute(router.pathname) && pageProps.bodyHtml;
  const useAccountShell =
    isAccount && pageProps.bodyHtml;

  const isAuthCallback = router.pathname === '/auth/callback';
  const showFastNav = !isAdmin && !isAuthCallback && !isOfferMotion;

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

  useEffect(() => {
    if (isOfferMotion) {
      document.body.classList.add('offer-ms-page');
      ensureOfferMotionSensorStylesheet();
      return () => document.body.classList.remove('offer-ms-page');
    }
    document.body.classList.remove('offer-ms-page');
  }, [isOfferMotion]);

  useEffect(() => {
    if (isAdmin) return undefined;
    const onRoute = () => {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
      } else if (typeof window.wnMetaPixel?.pageView === 'function') {
        window.wnMetaPixel.pageView();
      }
    };
    router.events.on('routeChangeComplete', onRoute);
    return () => router.events.off('routeChangeComplete', onRoute);
  }, [isAdmin, router.events]);

  return (
    <>
      {!isAdmin ? (
        <Script src="/js/meta-pixel.js?v=1" strategy="afterInteractive" id="wn-meta-pixel-helpers" />
      ) : null}
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
      {!isAdmin ? (
        <Script src="/js/app.js?v=33" strategy="beforeInteractive" id="wn-store-app" />
      ) : null}
      {isAdmin ? (
        <Script src="/js/admin-common.js?v=10" strategy="beforeInteractive" />
      ) : null}
      {isAdmin ? (
        <>
          <SeoHead seo={seoNoIndex('Admin')} />
          <Head>
            <link
              href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Hind+Siliguri:wght@300;400;500;600;700&display=swap"
              rel="stylesheet"
            />
            <link rel="stylesheet" href="/css/admin.css?v=11" />
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
      {isOfferMotion ? (
        <Head>
          <link
            id={OFFER_MS_CSS_ID}
            rel="stylesheet"
            href={OFFER_MS_CSS_HREF}
            key="offer-motion-sensor-css"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap"
            rel="stylesheet"
          />
        </Head>
      ) : null}
      {useStoreShell ? (
        <StorePage pageProps={pageProps} />
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
              {pageProps.scriptSrcs
                ?.filter((src) => !/^\/js\/app\.js(\?|$)/.test(src || ''))
                .map((src) => (
                <Script key={src} src={src} strategy="afterInteractive" />
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}
