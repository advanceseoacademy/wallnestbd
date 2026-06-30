import { getSessionFromPair } from '../lib/session';
import { renderPageForNext } from '../lib/renderView';
import { getCartPageData } from '../lib/storeData';
import { getSiteUrl, seoNoIndex } from '../lib/seo';

export default function CartPage({ bodyHtml }) {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );
}

export async function getServerSideProps({ req, res }) {
  try {
    const { req: reqLike } = await getSessionFromPair(req, res);
    const data = await getCartPageData(reqLike);
    const rendered = await renderPageForNext('cart', data);
    const baseUrl = getSiteUrl(req);
    const seo = seoNoIndex('কার্ট');
    res.setHeader('Cache-Control', 'private, max-age=0, stale-while-revalidate=30');
    return { props: { ...rendered, seo, siteUrl: baseUrl } };
  } catch (err) {
    console.error(err);
    return {
      props: {
        bodyHtml: `<div class="site-wrap" style="padding:48px;text-align:center"><p>${err.message}</p></div>`,
        inlineScripts: '',
        scriptSrcs: [],
      },
    };
  }
}
