const { supabase } = require('./supabase');
const { slugifyProduct } = require('./productSlugUtils');

async function ensureUniqueProductSlug(baseSlug, excludeId = null) {
  let slug = slugifyProduct(baseSlug) || 'product';
  let n = 0;
  while (n < 200) {
    const candidate = n ? `${slug}-${n}` : slug;
    let q = supabase.from('products').select('id').eq('slug', candidate);
    if (excludeId) q = q.neq('id', excludeId);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
    n += 1;
  }
  return `${slug}-${Date.now()}`;
}

async function resolveProductSlugForDb(body, productId = null) {
  const fromBody = slugifyProduct(body.slug || '');
  const base = fromBody || slugifyProduct(body.name_en || body.name);
  return ensureUniqueProductSlug(base, productId);
}

module.exports = {
  ...require('./productSlugUtils'),
  ensureUniqueProductSlug,
  resolveProductSlugForDb,
};
