import { getSessionFromPair } from '../lib/session';
import { renderPageForNext } from '../lib/renderView';
import { getReviewsPageData } from '../lib/storeData';
import { getSiteUrl, seoForReviews } from '../lib/seo';

export default function ReviewsPage({ bodyHtml }) {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );
}

export async function getServerSideProps({ req, res, query }) {
  try {
    const { req: reqLike } = await getSessionFromPair(req, res);
    const data = await getReviewsPageData(reqLike, query);
    const rendered = await renderPageForNext('reviews', data);
    const baseUrl = getSiteUrl(req);
    const seo = seoForReviews(baseUrl, {
      currentPage: data.currentPage,
      totalPages: data.totalPages,
    });
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
