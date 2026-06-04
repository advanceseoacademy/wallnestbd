const { supabase } = require('./supabase');
const { mapProduct } = require('./mapProduct');
const { filterStoreCategories } = require('./catalogCategories');
const cache = require('./serverCache');

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
  const categories = filterStoreCategories(data);
  cache.set('categories', categories, TTL.categories);
  return categories;
}

async function getCachedCatalogBundle() {
  const hit = cache.get('catalog:bundle');
  if (hit) return hit;

  const [{ data: products }, { data: flash }, { data: reviews }] =
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
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

  const bundle = {
    products: (products || []).map(mapProduct),
    flashProducts: (flash || []).map(mapProduct),
    reviews: reviews || [],
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

function bustCatalog() {
  cache.del('catalog:bundle');
  cache.del('categories');
}

module.exports = {
  getCachedCategories,
  getCachedCatalogBundle,
  getCachedProductById,
  bustCatalog,
  TTL,
};
