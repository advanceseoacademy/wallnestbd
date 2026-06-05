const { truncateTitle } = require('./truncateTitle');
const { normalizeProductImages, primaryImageUrl } = require('./productImages');
const { slugifyProduct } = require('./productSlugUtils');
const { normalizeProductSizes, listingFromSizes } = require('./productSizes');

function mapProduct(p) {
  const cat = p.categories || {};
  const name = p.name_en;
  const nameBn = p.name_bn;
  const images = normalizeProductImages(p.images, p.image_url);
  const slug = p.slug || slugifyProduct(name);
  const sizes = normalizeProductSizes(p.sizes, p);
  const listing = listingFromSizes(sizes);
  return {
    id: p.legacy_id || p.id,
    slug,
    uuid: p.id,
    name,
    nameBn,
    nameDisplay: truncateTitle(name),
    nameBnDisplay: truncateTitle(nameBn),
    cat: cat.name_en || 'General',
    catSlug: cat.slug,
    icon: p.icon || '📦',
    images,
    imageUrl: primaryImageUrl(images, p.image_url),
    sizes,
    fromPrice: listing.fromPrice,
    price: listing.price || Number(p.price),
    original: listing.original || Number(p.original_price || p.price),
    rating: Number(p.rating),
    reviews: p.review_count || 0,
    badge: p.badge,
    desc: p.description || '',
    stock: listing.stock ?? p.stock ?? 100,
  };
}

module.exports = { mapProduct, truncateTitle };
