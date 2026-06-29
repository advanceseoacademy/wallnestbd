const { supabase } = require('./supabase');
const { mapProduct } = require('./mapProduct');
const { getPageContext } = require('./pageContext');
const { getAccountData } = require('./accountService');
const {
  getCachedCatalogBundle,
  getCachedNewArrivalsAll,
  getReviewsPage,
  getCachedProductById,
} = require('./catalogCache');
const { buildCategorySections } = require('./homeCategorySections');

async function getHomeData(req, query = {}) {
  const [ctx, catalog] = await Promise.all([
    getPageContext(req),
    getCachedCatalogBundle(),
  ]);

  let productList = [...catalog.products];
  const catFilter = query.category;
  const qRaw = qString(query.q) || '';
  const q = qRaw.trim().toLowerCase();
  const isCategoryOnly = catFilter && catFilter !== 'all';

  if (isCategoryOnly) {
    productList = productList.filter((p) => p.catSlug === catFilter);
    ctx.activeNav = catFilter;
  } else {
    ctx.activeNav = 'home';
  }
  if (q) {
    productList = productList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.nameBn && p.nameBn.includes(q)) ||
        p.cat.toLowerCase().includes(q)
    );
  }

  const sectionProducts = isCategoryOnly || q ? productList : catalog.products;
  const categorySections = isCategoryOnly
    ? buildCategorySections(ctx.categories, productList, catFilter)
    : buildCategorySections(ctx.categories, sectionProducts);

  const matchesSearch = (p) =>
    !q ||
    p.name.toLowerCase().includes(q) ||
    (p.nameBn && p.nameBn.includes(q)) ||
    p.cat.toLowerCase().includes(q);

  let flashProducts = catalog.flashProducts;
  let newArrivalProducts = catalog.newArrivalProducts;
  if (isCategoryOnly) {
    flashProducts = flashProducts.filter((p) => p.catSlug === catFilter);
    newArrivalProducts = newArrivalProducts.filter((p) => p.catSlug === catFilter);
  }
  if (q) {
    flashProducts = flashProducts.filter(matchesSearch);
    newArrivalProducts = newArrivalProducts.filter(matchesSearch);
  }

  const catalogCats = (ctx.categories || []).filter((c) => c.slug && c.slug !== 'all');
  const rated = catalog.products.filter((p) => Number(p.rating) > 0);
  const heroStats = {
    categoryCount: catalogCats.length,
    productCount: catalog.products.length,
    avgRating: rated.length
      ? (rated.reduce((s, p) => s + Number(p.rating), 0) / rated.length).toFixed(1)
      : '4.8',
  };

  return {
    ...ctx,
    searchQuery: qRaw,
    products: productList,
    categorySections: categorySections.filter((sec) => sec.products.length > 0 || !q),
    flashProducts,
    newArrivalProducts,
    reviews: isCategoryOnly || q ? [] : catalog.reviews,
    heroStats,
    isCategoryPage: isCategoryOnly,
    isSearchPage: !!q,
  };
}

function qString(v) {
  if (Array.isArray(v)) return v[0];
  return v || '';
}

async function getProductData(req, id) {
  const [ctx, cached] = await Promise.all([
    getPageContext(req),
    getCachedProductById(id),
  ]);

  if (!cached) return null;

  const { raw } = cached;
  const product = cached.mapped;
  const relatedPromise = raw.category_id
    ? supabase
        .from('products')
        .select('*, categories(slug, name_en, name_bn)')
        .eq('category_id', raw.category_id)
        .neq('id', raw.id)
        .order('legacy_id')
        .limit(8)
    : Promise.resolve({ data: [] });

  const [{ data: relatedRaw }, { data: productReviews }, { data: alsoLikeRaw }] =
    await Promise.all([
      relatedPromise,
      supabase
        .from('reviews')
        .select('*')
        .eq('product_id', raw.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('products')
        .select('*, categories(slug, name_en, name_bn)')
        .eq('is_featured', true)
        .neq('id', raw.id)
        .order('legacy_id')
        .limit(4),
    ]);

  return {
    ...ctx,
    product,
    related: (relatedRaw || []).map(mapProduct),
    alsoLike: (alsoLikeRaw || []).map(mapProduct),
    productReviews: productReviews || [],
  };
}

async function getAccountPageData(req) {
  if (!req.session?.user?.id) {
    return { redirect: '/?login=1&next=/account' };
  }
  const [ctx, account] = await Promise.all([
    getPageContext(req),
    getAccountData(req.session.user, {
      sessionId: req.sessionID,
      skipGuestLink: true,
    }),
  ]);
  const accountJson = JSON.stringify(account).replace(/</g, '\\u003c');
  return { ...ctx, accountJson };
}

async function getNewArrivalsPageData(req) {
  const [ctx, newArrivalProducts] = await Promise.all([
    getPageContext(req),
    getCachedNewArrivalsAll(),
  ]);
  return {
    ...ctx,
    newArrivalProducts,
    activeNav: 'new-arrivals',
  };
}

async function getTrackOrderPageData(req, query = {}) {
  const ctx = await getPageContext(req);
  const order = qString(query.order) || qString(query.orderNumber) || '';
  return {
    ...ctx,
    activeNav: '',
    prefillOrder: order,
  };
}

async function getReviewsPageData(req, query = {}) {
  const page = query.page ?? req?.query?.page ?? 1;
  const [ctx, pagination] = await Promise.all([
    getPageContext(req),
    getReviewsPage(page),
  ]);
  return {
    ...ctx,
    ...pagination,
    activeNav: 'reviews',
  };
}

module.exports = {
  getHomeData,
  getProductData,
  getAccountPageData,
  getNewArrivalsPageData,
  getTrackOrderPageData,
  getReviewsPageData,
};
