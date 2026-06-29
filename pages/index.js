import { getSessionFromPair } from '../lib/session';
import { renderPageForNext } from '../lib/renderView';
import { getHomeData } from '../lib/storeData';
import { getSiteUrl, seoForHome } from '../lib/seo';

export default function Home({ bodyHtml }) {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );
}

export async function getServerSideProps({ req, res, query }) {
  try {
    if (query.code || query.error || query.error_description) {
      const params = new URLSearchParams();
      if (query.code) params.set('code', String(query.code));
      if (query.error) params.set('error', String(query.error));
      if (query.error_description) {
        params.set('error_description', String(query.error_description));
      }
      params.set('next', query.next ? String(query.next) : '/account');
      return {
        redirect: {
          destination: `/auth/callback?${params.toString()}`,
          permanent: false,
        },
      };
    }

    const cat = query.category;
    const q = query.q;
    if (cat && cat !== 'all' && !q) {
      return {
        redirect: { destination: `/category/${cat}`, permanent: true },
      };
    }

    const { req: reqLike } = await getSessionFromPair(req, res);
    const data = await getHomeData(reqLike, query);
    const rendered = await renderPageForNext('index', data);
    const baseUrl = getSiteUrl(req);
    const seo = seoForHome(baseUrl, { searchQuery: data.searchQuery });

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
        seo: null,
        siteUrl: getSiteUrl(req),
      },
    };
  }
}
