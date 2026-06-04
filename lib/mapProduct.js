function mapProduct(p) {
  const cat = p.categories || {};
  return {
    id: p.legacy_id || p.id,
    uuid: p.id,
    name: p.name_en,
    nameBn: p.name_bn,
    cat: cat.name_en || 'General',
    catSlug: cat.slug,
    icon: p.icon || '📦',
    imageUrl: p.image_url || null,
    price: Number(p.price),
    original: Number(p.original_price || p.price),
    rating: Number(p.rating),
    reviews: p.review_count || 0,
    badge: p.badge,
    desc: p.description || '',
    stock: p.stock ?? 100,
  };
}

module.exports = { mapProduct };
