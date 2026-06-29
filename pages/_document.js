import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    const pathname = ctx.pathname || '';
    const isAdmin = pathname.startsWith('/admin');
    const isAccount = pathname.startsWith('/account');
    return {
      ...initialProps,
      skipStoreCss: isAdmin,
      isAccount,
    };
  }

  render() {
    const { skipStoreCss, isAccount } = this.props;
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
              <link rel="stylesheet" href="/css/style.css?v=54" />
              <link
                href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap"
                rel="stylesheet"
              />
            </>
          ) : null}
          {isAccount ? (
            <link rel="stylesheet" href="/css/user-dashboard.css?v=23" />
          ) : null}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
