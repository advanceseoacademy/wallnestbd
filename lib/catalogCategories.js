/** WallNest BD — wall art catalog (target mix %) */
const WALL_ART_CATEGORY_SLUGS = [
  'islamic-wall-art',
  'family-photo-canvas',
  'kids-room-art',
  'office-motivational-art',
];

const LEGACY_CATEGORY_SLUGS = [
  'electronics',
  'fashion',
  'home',
  'beauty',
  'toys',
  'sports',
  'grocery',
  'pets',
  'tools',
];

function isWallArtCategory(slug) {
  return WALL_ART_CATEGORY_SLUGS.includes(slug);
}

function isLegacyCategory(slug) {
  return LEGACY_CATEGORY_SLUGS.includes(slug);
}

function isCatalogCategory(slug) {
  return slug && slug !== 'all' && !isLegacyCategory(slug);
}

function slugifyCategory(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function filterStoreCategories(categories) {
  return (categories || []).filter(
    (c) => c.slug === 'all' || isCatalogCategory(c.slug)
  );
}

function filterAdminCategories(categories) {
  return (categories || []).filter((c) => isCatalogCategory(c.slug));
}

module.exports = {
  WALL_ART_CATEGORY_SLUGS,
  LEGACY_CATEGORY_SLUGS,
  isWallArtCategory,
  isLegacyCategory,
  isCatalogCategory,
  slugifyCategory,
  filterStoreCategories,
  filterAdminCategories,
};
