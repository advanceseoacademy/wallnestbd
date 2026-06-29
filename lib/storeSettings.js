const { supabase } = require('./supabase');

const PLACEHOLDER_NUMBERS = new Set(['01XXXXXXXXX', '01XXXXXXXX', '']);

const DEFAULTS = {
  freeShippingMin: Number(process.env.FREE_SHIPPING_MIN) || 1500,
  shippingFee: Number(process.env.SHIPPING_FEE) || 80,
  supportPhone: (process.env.STORE_SUPPORT_PHONE || '').trim(),
  supportEmail: (process.env.STORE_SUPPORT_EMAIL || 'support@wallnestbd.com').trim(),
  brandName: 'WallNest BD',
};

let cache = null;
let cacheAt = 0;
const TTL_MS = 60_000;

function cleanPhone(phone) {
  const value = String(phone || '').trim();
  if (!value || PLACEHOLDER_NUMBERS.has(value)) return DEFAULTS.supportPhone;
  return value;
}

async function getStoreSettings() {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;

  const [{ data: brandRow }, { data: shipRow }] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', 'brand').maybeSingle(),
    supabase.from('site_settings').select('value').eq('key', 'shipping_rules').maybeSingle(),
  ]);

  const brand = brandRow?.value || {};
  const ship = shipRow?.value || {};

  cache = {
    brandName: brand.name || DEFAULTS.brandName,
    supportPhone: cleanPhone(brand.support_phone),
    supportEmail: String(brand.support_email || DEFAULTS.supportEmail).trim(),
    freeShippingMin: Number(ship.free_shipping_min ?? ship.min_order ?? DEFAULTS.freeShippingMin),
    shippingFee: Number(ship.shipping_fee ?? DEFAULTS.shippingFee),
  };
  cacheAt = Date.now();
  return cache;
}

function computeShipping(subtotal, settings) {
  const min = settings?.freeShippingMin ?? DEFAULTS.freeShippingMin;
  const fee = settings?.shippingFee ?? DEFAULTS.shippingFee;
  return Number(subtotal) >= min ? 0 : fee;
}

function bustStoreSettingsCache() {
  cache = null;
  cacheAt = 0;
}

module.exports = {
  getStoreSettings,
  computeShipping,
  bustStoreSettingsCache,
  DEFAULTS,
};
