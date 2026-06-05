const { WALL_ART_CATEGORY_SLUGS } = require('./catalogCategories');

/** Four homepage sections — one per wall-art category. */
function buildCategorySections(categories, products) {
  const bySlug = new Map((categories || []).map((c) => [c.slug, c]));

  return WALL_ART_CATEGORY_SLUGS.map((slug) => {
    const cat = bySlug.get(slug) || {};
    return {
      slug,
      icon: cat.icon || '🖼️',
      nameEn: cat.name_en || slug,
      nameBn: cat.name_bn || cat.name_en || slug,
      products: (products || []).filter((p) => p.catSlug === slug),
    };
  });
}

module.exports = { buildCategorySections };
