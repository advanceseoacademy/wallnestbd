/** Storefront SKU — always exactly 5 characters (e.g. WN001, WN042). */

const SKU_LEN = 5;
const SKU_PREFIX = 'WN';

function formatProductSku(product) {
  const legacyId = product?.legacy_id ?? product?.legacyId;
  if (legacyId != null && legacyId !== '') {
    const n = Number(legacyId);
    if (!Number.isNaN(n) && n > 0) {
      const suffix = String(n % 1000).padStart(SKU_LEN - SKU_PREFIX.length, '0');
      return `${SKU_PREFIX}${suffix}`;
    }
  }
  const uuid = String(product?.id || product?.uuid || '').replace(/-/g, '');
  if (uuid.length >= SKU_LEN - SKU_PREFIX.length) {
    return `${SKU_PREFIX}${uuid.slice(0, SKU_LEN - SKU_PREFIX.length).toUpperCase()}`;
  }
  return `${SKU_PREFIX}${'0'.repeat(SKU_LEN - SKU_PREFIX.length)}`;
}

async function getNextLegacyId(db) {
  const { data, error } = await db
    .from('products')
    .select('legacy_id')
    .order('legacy_id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.legacy_id ?? 0) + 1;
}

module.exports = { formatProductSku, getNextLegacyId, SKU_LEN };
