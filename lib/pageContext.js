const { getCartItems } = require('./cart');
const { getCachedCategories } = require('./catalogCache');

async function getPageContext(req) {
  const [categories, cartItems] = await Promise.all([
    getCachedCategories(),
    req ? getCartItems(req).catch(() => []) : Promise.resolve([]),
  ]);
  return {
    categories,
    cartCount: cartItems.reduce((s, i) => s + i.qty, 0),
    user: req?.session?.user || null,
  };
}

module.exports = { getPageContext };
