const STANDARD_PRODUCT_SIZES = [
  { label: '6×8"', priceMultiplier: 1 },
  { label: '8×10"', priceMultiplier: 1.25 },
  { label: '10×12"', priceMultiplier: 1.55 },
  { label: '12×16"', priceMultiplier: 1.95 },
];

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSizeEntry(entry, index = 0) {
  if (!entry || typeof entry !== 'object') return null;
  const label = String(entry.label || entry.size || '').trim();
  if (!label) return null;
  const price = toNumber(entry.price);
  if (price <= 0) return null;
  const original = toNumber(entry.original_price ?? entry.original, price);
  return {
    label,
    label_bn: String(entry.label_bn || entry.labelBn || label).trim() || label,
    price,
    original: original > price ? original : price,
    stock: Math.max(0, Math.floor(toNumber(entry.stock, 0))),
  };
}

function normalizeProductSizes(rawSizes, product = {}) {
  let list = [];
  if (Array.isArray(rawSizes)) {
    list = rawSizes.map(normalizeSizeEntry).filter(Boolean);
  } else if (typeof rawSizes === 'string' && rawSizes.trim()) {
    try {
      const parsed = JSON.parse(rawSizes);
      if (Array.isArray(parsed)) {
        list = parsed.map(normalizeSizeEntry).filter(Boolean);
      }
    } catch (_) {}
  }
  if (list.length) return list;

  const price = toNumber(product.price);
  const original = toNumber(product.original_price ?? product.original, price);
  const stock = Math.max(0, Math.floor(toNumber(product.stock, 0)));
  if (price <= 0) return [];
  return [
    {
      label: 'Standard',
      label_bn: 'স্ট্যান্ডার্ড',
      price,
      original: original > price ? original : price,
      stock,
    },
  ];
}

function listingFromSizes(sizes) {
  if (!sizes.length) {
    return { price: 0, original: 0, stock: 0, fromPrice: false };
  }
  const price = Math.min(...sizes.map((s) => s.price));
  const priced = sizes.filter((s) => s.price === price);
  const original = Math.min(...priced.map((s) => s.original));
  const stock = sizes.reduce((sum, s) => sum + s.stock, 0);
  return {
    price,
    original: original > price ? original : price,
    stock,
    fromPrice: sizes.length > 1,
  };
}

function resolveSize(sizes, sizeLabel) {
  const list = normalizeProductSizes(sizes);
  if (!list.length) return null;
  const label = String(sizeLabel || '').trim();
  if (!label) return list.find((s) => s.stock > 0) || list[0];
  return list.find((s) => s.label === label) || null;
}

function buildStandardSizesFromBase(price, originalPrice, stock) {
  const basePrice = toNumber(price);
  const baseOriginal = toNumber(originalPrice, basePrice);
  const totalStock = Math.max(0, Math.floor(toNumber(stock, 0)));
  const count = STANDARD_PRODUCT_SIZES.length;
  const perSize = Math.max(1, Math.floor(totalStock / count) || 1);

  return STANDARD_PRODUCT_SIZES.map((preset, index) => {
    const isLast = index === count - 1;
    const sizeStock = isLast
      ? Math.max(1, totalStock - perSize * (count - 1))
      : perSize;
    return {
      label: preset.label,
      label_bn: preset.label,
      price: Math.round(basePrice * preset.priceMultiplier),
      original_price: Math.round(baseOriginal * preset.priceMultiplier),
      stock: sizeStock,
    };
  });
}

function resolveProductSizesForDb(body = {}) {
  const sizes = normalizeProductSizes(body.sizes, {
    price: body.price,
    original_price: body.original_price,
    stock: body.stock,
  });
  const listing = listingFromSizes(sizes);
  return {
    sizes,
    price: listing.price,
    original_price: listing.original,
    stock: listing.stock,
  };
}

module.exports = {
  STANDARD_PRODUCT_SIZES,
  buildStandardSizesFromBase,
  normalizeProductSizes,
  listingFromSizes,
  resolveSize,
  resolveProductSizesForDb,
};
