/** Default hero grid images (slug → static path) when DB has no hero_image_url */
const DEFAULT_HERO_BY_SLUG = {
  'islamic-wall-art': '/images/hero/islamic-wall-art.jpg',
  'family-photo-canvas': '/images/hero/family-photo-canvas.jpg',
  'kids-room-art': '/images/hero/kids-room-art.jpg',
  'office-motivational-art': '/images/hero/abstract-office.jpg',
};

const HERO_PLACEHOLDER = '/images/hero/islamic-wall-art.jpg';

function resolveCategoryHeroUrl(cat) {
  const url = cat?.hero_image_url?.trim();
  if (url) return url;
  return DEFAULT_HERO_BY_SLUG[cat?.slug] || HERO_PLACEHOLDER;
}

function enrichCategoriesWithHero(categories) {
  return (categories || []).map((c) => ({
    ...c,
    heroImageUrl: resolveCategoryHeroUrl(c),
  }));
}

function getHeroCategories(categories, limit = 4) {
  return enrichCategoriesWithHero(categories)
    .filter((c) => c.slug && c.slug !== 'all')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, limit);
}

module.exports = {
  DEFAULT_HERO_BY_SLUG,
  resolveCategoryHeroUrl,
  enrichCategoriesWithHero,
  getHeroCategories,
};
