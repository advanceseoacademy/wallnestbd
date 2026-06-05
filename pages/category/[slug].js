import { getSessionFromPair } from '../../lib/session';
import { renderPageForNext } from '../../lib/renderView';
import { getHomeData } from '../../lib/storeData';
import { getSiteUrl, seoForCategory } from '../../lib/seo';
import { isCatalogCategory } from '../../lib/catalogCategories';

export default function CategoryPage({ bodyHtml }) {
  return (
    <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );
}

export async function getServerSideProps({ req, res, params }) {
  try {
    const slug = params.slug;
    if (!slug || !isCatalogCategory(slug)) {
      return { notFound: true };
    }

    const { req: reqLike } = await getSessionFromPair(req, res);
    const data = await getHomeData(reqLike, { category: slug });
    const category = (data.categories || []).find((c) => c.slug === slug);
    if (!category) {
      return { notFound: true };
    }

    const rendered = await renderPageForNext('index', {
      ...data,
      activeNav: slug,
    });
    const baseUrl = getSiteUrl(req);
    const seo = seoForCategory(category, baseUrl);

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
