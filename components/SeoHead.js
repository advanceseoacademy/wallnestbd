import Head from 'next/head';
import { absUrl } from '../lib/seo';

export default function SeoHead({ seo, baseUrl }) {
  if (!seo) return null;

  const ogImage = seo.ogImage
    ? absUrl(baseUrl || '', seo.ogImage)
    : null;

  return (
    <Head>
      <title>{seo.title}</title>
      {seo.description ? (
        <meta name="description" content={seo.description} />
      ) : null}
      {seo.robots ? <meta name="robots" content={seo.robots} /> : null}
      {seo.canonical ? <link rel="canonical" href={seo.canonical} /> : null}
      {seo.prev ? <link rel="prev" href={seo.prev} /> : null}
      {seo.next ? <link rel="next" href={seo.next} /> : null}

      <meta property="og:site_name" content="WallNest BD" />
      <meta property="og:locale" content="bn_BD" />
      <meta property="og:type" content={seo.ogType || 'website'} />
      <meta property="og:title" content={seo.title} />
      {seo.description ? (
        <meta property="og:description" content={seo.description} />
      ) : null}
      {seo.canonical ? (
        <meta property="og:url" content={seo.canonical} />
      ) : null}
      {ogImage ? <meta property="og:image" content={ogImage} /> : null}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seo.title} />
      {seo.description ? (
        <meta name="twitter:description" content={seo.description} />
      ) : null}
      {ogImage ? <meta name="twitter:image" content={ogImage} /> : null}

      {seo.jsonLd?.map((block, i) => (
        <script
          key={`jsonld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
    </Head>
  );
}
