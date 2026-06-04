import dynamic from 'next/dynamic';
import Head from 'next/head';
import Script from 'next/script';
import { useRouter } from 'next/router';
import StorePage from '../components/StorePage';

const FastNav = dynamic(() => import('../components/FastNav'), { ssr: false });

function isStoreRoute(pathname) {
  return pathname === '/' || pathname.startsWith('/product/');
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const isAdmin = router.pathname.startsWith('/admin');
  const isAccount = router.pathname.startsWith('/account');
  const useStoreShell =
    !isAdmin && !isAccount && isStoreRoute(router.pathname) && pageProps.bodyHtml;

  return (
    <>
      <FastNav />
      {isAdmin ? (
        <Head>
          <link
            href="https://fonts.googleapis.com/css2?family=Syne:wght@700&family=Hind+Siliguri:wght@400;600&display=swap"
            rel="stylesheet"
          />
          <link rel="stylesheet" href="/css/admin.css" />
        </Head>
      ) : null}
      {isAccount ? (
        <Head>
          <link rel="stylesheet" href="/css/user-dashboard.css?v=13" />
        </Head>
      ) : null}
      {useStoreShell ? (
        <StorePage pageProps={pageProps} />
      ) : (
        <>
          <Component {...pageProps} />
          {!isAdmin && pageProps.inlineScripts ? (
            <Script
              id="store-inline"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{ __html: pageProps.inlineScripts }}
            />
          ) : null}
          {!isAdmin &&
            pageProps.scriptSrcs?.map((src) => (
              <Script key={src} src={src} strategy="afterInteractive" />
            ))}
        </>
      )}
    </>
  );
}
