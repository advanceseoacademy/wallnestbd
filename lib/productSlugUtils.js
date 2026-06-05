function slugifyProduct(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function productPath(product) {
  const slug = product?.slug || slugifyProduct(product?.name || product?.name_en);
  if (slug) return `/product/${slug}`;
  const id = product?.id ?? product?.legacy_id;
  return id != null ? `/product/${id}` : '/';
}

module.exports = {
  slugifyProduct,
  productPath,
};
