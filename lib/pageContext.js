const { getCartItems } = require('./cart');
const { getCachedCategories } = require('./catalogCache');
const { getStoreSettings } = require('./storeSettings');

async function getPageContext(req) {
  const [categories, cartItems, storeSettings] = await Promise.all([
    getCachedCategories(),
    req ? getCartItems(req).catch(() => []) : Promise.resolve([]),
    getStoreSettings().catch(() => null),
  ]);
  return {
    categories,
    cartCount: cartItems.reduce((s, i) => s + i.qty, 0),
    user: req?.session?.user || null,
    storeSettings,
  };
}

module.exports = { getPageContext };
