const PRODUCT_TITLE_MAX = 30;

function truncateTitle(text, max = PRODUCT_TITLE_MAX) {
  const s = String(text || '').trim();
  if (!s) return '';
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}...`;
}

module.exports = { truncateTitle, PRODUCT_TITLE_MAX };
