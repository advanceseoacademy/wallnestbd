const { supabase } = require('./supabase');
const { mapProduct } = require('./mapProduct');
const { getPageContext } = require('./pageContext');
const { getAccountData } = require('./accountService');
const {
  getCachedCatalogBundle,
  getCachedProductById,
} = require('./catalogCache');

async function getHomeData(req, query = {}) {
  const [ctx, catalog] = await Promise.all([
    getPageContext(req),
    getCachedCatalogBundle(),
  ]);

  let productList = [...catalog.products];
  const catFilter = query.category;
  const q = (qString(query.q) || '').trim().toLowerCase();
  if (catFilter && catFilter !== 'all') {
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

  return {
    ...ctx,
    searchQuery: query.q || '',
    products: productList,
    flashProducts: catalog.flashProducts,
    reviews: catalog.reviews,
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
  const ctx = await getPageContext(req);
  if (!req.session?.user?.id) {
    return { redirect: '/?login=1&next=/account' };
  }
  const account = await getAccountData(req.session.user, {
    sessionId: req.sessionID,
  });
  const accountJson = JSON.stringify(account).replace(/</g, '\\u003c');
  return { ...ctx, accountJson };
}

module.exports = { getHomeData, getProductData, getAccountPageData };
