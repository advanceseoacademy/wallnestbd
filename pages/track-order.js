import { getSessionFromPair } from '../lib/session';
import { renderPageForNext } from '../lib/renderView';
import { getTrackOrderPageData } from '../lib/storeData';
import { getSiteUrl, seoForTrackOrder } from '../lib/seo';

export default function TrackOrderPage({ bodyHtml }) {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );
}

export async function getServerSideProps({ req, res, query }) {
  try {
    const { req: reqLike } = await getSessionFromPair(req, res);
    const data = await getTrackOrderPageData(reqLike, query);
    const rendered = await renderPageForNext('track-order', data);
    const baseUrl = getSiteUrl(req);
    const seo = seoForTrackOrder(baseUrl);
    res.setHeader(
      'Cache-Control',
      'private, max-age=0, stale-while-revalidate=30'
    );
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
