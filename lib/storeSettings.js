const { supabase } = require('./supabase');

const PLACEHOLDER_NUMBERS = new Set(['01XXXXXXXXX', '01XXXXXXXX', '']);

const DEFAULTS = {
  freeShippingMin: Number(process.env.FREE_SHIPPING_MIN) || 1500,
  shippingFee: Number(process.env.SHIPPING_FEE) || 80,
  insideDhakaFee: Number(process.env.INSIDE_DHAKA_FEE) || 60,
  outsideDhakaFee: Number(process.env.OUTSIDE_DHAKA_FEE) || 120,
  supportPhone: (process.env.STORE_SUPPORT_PHONE || '').trim(),
  supportEmail: (process.env.STORE_SUPPORT_EMAIL || 'support@wallnestbd.com').trim(),
  brandName: 'WallNest BD',
};

const DELIVERY_AREAS = new Set(['inside_dhaka', 'outside_dhaka']);

let cache = null;
let cacheAt = 0;
const TTL_MS = 60_000;

function cleanPhone(phone) {
  const value = String(phone || '').trim();
  if (!value || PLACEHOLDER_NUMBERS.has(value)) return DEFAULTS.supportPhone;
  return value;
}

function normalizeDeliveryArea(area) {
  const key = String(area || 'inside_dhaka').trim().toLowerCase();
  return DELIVERY_AREAS.has(key) ? key : 'inside_dhaka';
}

async function getStoreSettings() {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;

  const [{ data: brandRow }, { data: shipRow }] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', 'brand').maybeSingle(),
    supabase.from('site_settings').select('value').eq('key', 'shipping_rules').maybeSingle(),
  ]);

  const brand = brandRow?.value || {};
  const ship = shipRow?.value || {};
  const legacyFee = Number(ship.shipping_fee ?? DEFAULTS.shippingFee);

  cache = {
    brandName: brand.name || DEFAULTS.brandName,
    supportPhone: cleanPhone(brand.support_phone),
    supportEmail: String(brand.support_email || DEFAULTS.supportEmail).trim(),
    freeShippingMin: Number(ship.free_shipping_min ?? ship.min_order ?? DEFAULTS.freeShippingMin),
    shippingFee: legacyFee,
    insideDhakaFee: Number(ship.inside_dhaka_fee ?? legacyFee ?? DEFAULTS.insideDhakaFee),
    outsideDhakaFee: Number(ship.outside_dhaka_fee ?? legacyFee ?? DEFAULTS.outsideDhakaFee),
  };
  cacheAt = Date.now();
  return cache;
}

function computeShipping(subtotal, settings, deliveryArea = 'inside_dhaka') {
  const min = settings?.freeShippingMin ?? DEFAULTS.freeShippingMin;
  if (Number(subtotal) >= min) return 0;
  const area = normalizeDeliveryArea(deliveryArea);
  if (area === 'outside_dhaka') {
    return Number(settings?.outsideDhakaFee ?? settings?.shippingFee ?? DEFAULTS.outsideDhakaFee);
  }
  return Number(settings?.insideDhakaFee ?? settings?.shippingFee ?? DEFAULTS.insideDhakaFee);
}

function bustStoreSettingsCache() {
  cache = null;
  cacheAt = 0;
}

module.exports = {
  getStoreSettings,
  computeShipping,
  normalizeDeliveryArea,
  bustStoreSettingsCache,
  DEFAULTS,
  DELIVERY_AREAS,
};
