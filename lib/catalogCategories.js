/** WallNest BD — wall art catalog (target mix %) */
const WALL_ART_CATEGORY_SLUGS = [
  'islamic-wall-art',
  'family-photo-canvas',
  'kids-room-art',
  'office-motivational-art',
  'abstract-wall-art',
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

function filterStoreCategories(categories) {
  return (categories || []).filter(
    (c) => c.slug === 'all' || isWallArtCategory(c.slug)
  );
}

function filterAdminCategories(categories) {
  return (categories || []).filter((c) => isWallArtCategory(c.slug));
}

module.exports = {
  WALL_ART_CATEGORY_SLUGS,
  LEGACY_CATEGORY_SLUGS,
  isWallArtCategory,
  filterStoreCategories,
  filterAdminCategories,
};
