const { supabase } = require('./supabase');
const { mapProduct } = require('./mapProduct');
const { filterStoreCategories } = require('./catalogCategories');
const { enrichCategoriesWithHero } = require('./categoryHero');
const cache = require('./serverCache');

function mapReviewsForHome(rows) {
  return rows.map((r) => {
    const prod = r.products || {};
    return {
      ...r,
      product_name: prod.name_en || null,
      product_name_bn: prod.name_bn || null,
    };
  });
}

const {
  NEW_ARRIVAL_HOME_LIMIT,
  NEW_ARRIVAL_ALL_LIMIT,
} = require('./newArrivals');

const REVIEWS_ALL_LIMIT = 30;
const REVIEWS_PER_PAGE = 6;

const TTL = {
  categories: 120_000,
  catalog: 45_000,
  product: 60_000,
  reviews: 90_000,
};

async function getCachedCategories() {
  const hit = cache.get('categories');
  if (hit) return hit;

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  const categories = enrichCategoriesWithHero(filterStoreCategories(data));
  cache.set('categories', categories, TTL.categories);
  return categories;
}

async function getCachedCatalogBundle() {
  const hit = cache.get('catalog:bundle');
  if (hit) return hit;

  const [{ data: products }, { data: flash }, { data: newest }, { data: reviews }] =
    await Promise.all([
      supabase
        .from('products')
        .select('*, categories(slug, name_en, name_bn, catalog_share)')
        .order('legacy_id'),
      supabase
        .from('products')
        .select('*, categories(slug, name_en, name_bn)')
        .eq('is_flash_sale', true)
        .order('legacy_id')
        .limit(4),
      supabase
        .from('products')
        .select('*, categories(slug, name_en, name_bn, catalog_share)')
        .order('created_at', { ascending: false })
        .limit(NEW_ARRIVAL_HOME_LIMIT),
      supabase
        .from('reviews')
        .select('*, products(name_en, name_bn, legacy_id)')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

  const bundle = {
    products: (products || []).map(mapProduct),
    flashProducts: (flash || []).map(mapProduct),
    newArrivalProducts: (newest || []).map(mapProduct),
    reviews: mapReviewsForHome(reviews || []),
  };
  cache.set('catalog:bundle', bundle, TTL.catalog);
  return bundle;
}

async function getCachedProductById(id) {
  const key = `product:${id}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { filterByProductParam } = require('./productQuery');
  const { data: raw, error } = await filterByProductParam(
    supabase.from('products').select('*, categories(slug, name_en, name_bn)'),
    id
  ).maybeSingle();

  if (error) throw error;
  if (!raw) return null;

  const mapped = mapProduct(raw);
  cache.set(key, { raw, mapped }, TTL.product);
  return { raw, mapped };
}

async function getCachedNewArrivalsAll() {
  const hit = cache.get('catalog:new-arrivals-all');
  if (hit) return hit;

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(slug, name_en, name_bn, catalog_share)')
    .order('created_at', { ascending: false })
    .limit(NEW_ARRIVAL_ALL_LIMIT);
  if (error) throw error;

  const products = (data || []).map(mapProduct);
  cache.set('catalog:new-arrivals-all', products, TTL.catalog);
  return products;
}

async function getCachedReviewsAll() {
  const hit = cache.get('catalog:reviews-all');
  if (hit) return hit;

  const { data, error } = await supabase
    .from('reviews')
    .select('*, products(name_en, name_bn, legacy_id)')
    .order('created_at', { ascending: false })
    .limit(REVIEWS_ALL_LIMIT);
  if (error) throw error;
  const reviews = mapReviewsForHome(data || []);
  cache.set('catalog:reviews-all', reviews, TTL.reviews);
  return reviews;
}

async function getReviewsPage(page = 1) {
  const perPage = REVIEWS_PER_PAGE;
  let currentPage = Math.max(1, parseInt(String(page), 10) || 1);

  const { count, error: countError } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true });
  if (countError) throw countError;

  const totalReviews = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalReviews / perPage) || 1);
  currentPage = Math.min(currentPage, totalPages);

  const cacheKey = `catalog:reviews-page:${perPage}:${currentPage}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const from = (currentPage - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error } = await supabase
    .from('reviews')
    .select('*, products(name_en, name_bn, legacy_id)')
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;

  const result = {
    reviews: mapReviewsForHome(data || []),
    currentPage,
    totalPages,
    totalReviews,
    perPage,
  };
  cache.set(cacheKey, result, TTL.reviews);
  return result;
}

function bustCatalog() {
  cache.del('catalog:bundle');
  cache.del('catalog:new-arrivals-all');
  cache.del('catalog:reviews-all');
  cache.clearPrefix('catalog:reviews-page:');
  cache.del('categories');
}

module.exports = {
  getCachedCategories,
  getCachedCatalogBundle,
  getCachedNewArrivalsAll,
  getCachedReviewsAll,
  getReviewsPage,
  getCachedProductById,
  bustCatalog,
  mapReviewsForHome,
  REVIEWS_ALL_LIMIT,
  REVIEWS_PER_PAGE,
  TTL,
};
