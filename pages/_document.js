import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    const pathname = ctx.pathname || '';
    const isAdmin = pathname.startsWith('/admin');
    const isAccount = pathname.startsWith('/account');
    const isOfferMotion =
      pathname === '/offer/motion-sensor-light' ||
      pathname === '/offer/motion-sensor-light/thank-you';
    return {
      ...initialProps,
      skipStoreCss: isAdmin,
      isAccount,
      isOfferMotion,
    };
  }

  render() {
    const { skipStoreCss, isAccount, isOfferMotion } = this.props;
    return (
      <Html lang="bn">
        <Head>
          <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/images/favicon-180.png" />
          <meta name="theme-color" content="#0071CE" />
          <link rel="stylesheet" href="/css/route-progress.css" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {!skipStoreCss ? (
            <>
              <link rel="stylesheet" href="/css/style.css?v=78" />
              <link
                href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap"
                rel="stylesheet"
              />
            </>
          ) : null}
          {isAccount ? (
            <link rel="stylesheet" href="/css/user-dashboard.css?v=26" />
          ) : null}
          {isOfferMotion ? (
            <link rel="stylesheet" href="/css/offer-motion-sensor.css?v=5" />
          ) : null}
        </Head>
        <body className={isOfferMotion ? 'offer-ms-page' : undefined}>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
