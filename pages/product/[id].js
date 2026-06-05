import { getSessionFromPair } from '../../lib/session';
import { renderPageForNext } from '../../lib/renderView';
import { getProductData } from '../../lib/storeData';
import { getSiteUrl, seoForProduct } from '../../lib/seo';

export default function ProductPage({ bodyHtml }) {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );
}

export async function getServerSideProps({ req, res, params }) {
  try {
    const { req: reqLike } = await getSessionFromPair(req, res);
    const data = await getProductData(reqLike, params.id);
    if (data?.product?.slug && /^\d+$/.test(String(params.id))) {
      return {
        redirect: {
          destination: `/product/${data.product.slug}`,
          permanent: true,
        },
      };
    }
    if (!data) {
      return {
        props: {
          bodyHtml:
            '<div class="site-wrap" style="padding:48px"><h1>পণ্য পাওয়া যায়নি</h1><a href="/">হোম</a></div>',
          inlineScripts: '',
          scriptSrcs: [],
        },
      };
    }
    const rendered = await renderPageForNext('product', data);
    const baseUrl = getSiteUrl(req);
    const seo = seoForProduct(data.product, baseUrl);
    res.setHeader(
      'Cache-Control',
      'private, max-age=0, stale-while-revalidate=60'
    );
    return { props: { ...rendered, seo, siteUrl: baseUrl } };
  } catch (err) {
    console.error(err);
    return {
      props: {
        bodyHtml: `<div class="site-wrap" style="padding:48px"><p>${err.message}</p></div>`,
        inlineScripts: '',
        scriptSrcs: [],
      },
    };
  }
}
