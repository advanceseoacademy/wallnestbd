const { renderPageForNext } = require('./renderView');
const {
  getHomeData,
  getProductData,
  getNewArrivalsPageData,
  getTrackOrderPageData,
  getCheckoutPageData,
  getReviewsPageData,
} = require('./storeData');
const {
  getSiteUrl,
  seoForHome,
  seoForProduct,
  seoForCategory,
  seoForNewArrivals,
  seoForTrackOrder,
  seoForReviews,
  seoNoIndex,
} = require('./seo');
const { isCatalogCategory } = require('./catalogCategories');

function requestLikeFromHeaders(headers) {
  return {
    headers: {
      host: headers.get('host') || '',
      'x-forwarded-proto': headers.get('x-forwarded-proto') || 'http',
    },
  };
}

/**
 * Render storefront page props for a path (used by /api/store/page prefetch).
 */
async function renderStorePageByPath(reqLike, pathname, query = {}) {
  const path = String(pathname || '/').split('?')[0] || '/';
  const httpReq = reqLike.httpReq || null;

  if (path === '/' || path === '') {
    const data = await getHomeData(reqLike, query);
    const rendered = await renderPageForNext('index', data);
    const siteUrl = getSiteUrl(httpReq);
    return {
      ...rendered,
      seo: seoForHome(siteUrl, { searchQuery: data.searchQuery }),
      siteUrl,
    };
  }

  if (path.startsWith('/product/')) {
    const id = decodeURIComponent(path.slice('/product/'.length));
    const data = await getProductData(reqLike, id);
    if (!data) return null;
    const rendered = await renderPageForNext('product', data);
    const siteUrl = getSiteUrl(httpReq);
    return {
      ...rendered,
      seo: seoForProduct(data.product, siteUrl),
      siteUrl,
    };
  }

  if (path.startsWith('/category/')) {
    const slug = decodeURIComponent(path.slice('/category/'.length));
    if (!isCatalogCategory(slug)) return null;
    const data = await getHomeData(reqLike, { category: slug });
    const category = (data.categories || []).find((c) => c.slug === slug);
    if (!category) return null;
    const rendered = await renderPageForNext('index', { ...data, activeNav: slug });
    const siteUrl = getSiteUrl(httpReq);
    return {
      ...rendered,
      seo: seoForCategory(category, siteUrl),
      siteUrl,
    };
  }

  if (path === '/new-arrivals') {
    const data = await getNewArrivalsPageData(reqLike);
    const rendered = await renderPageForNext('new-arrivals', data);
    const siteUrl = getSiteUrl(httpReq);
    return {
      ...rendered,
      seo: seoForNewArrivals(siteUrl),
      siteUrl,
    };
  }

  if (path === '/track-order') {
    const data = await getTrackOrderPageData(reqLike, query);
    const rendered = await renderPageForNext('track-order', data);
    const siteUrl = getSiteUrl(httpReq);
    return {
      ...rendered,
      seo: seoForTrackOrder(siteUrl),
      siteUrl,
    };
  }

  if (path === '/checkout') {
    const data = await getCheckoutPageData(reqLike);
    const rendered = await renderPageForNext('checkout', data);
    const siteUrl = getSiteUrl(httpReq);
    return {
      ...rendered,
      seo: seoNoIndex('চেকআউট'),
      siteUrl,
    };
  }

  if (path === '/reviews') {
    const data = await getReviewsPageData(reqLike, query);
    const rendered = await renderPageForNext('reviews', data);
    const siteUrl = getSiteUrl(httpReq);
    return {
      ...rendered,
      seo: seoForReviews(siteUrl, {
        currentPage: data.currentPage,
        totalPages: data.totalPages,
      }),
      siteUrl,
    };
  }

  return null;
}

module.exports = {
  renderStorePageByPath,
  requestLikeFromHeaders,
};
