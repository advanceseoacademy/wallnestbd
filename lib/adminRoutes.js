const VIEW_MAP = {
  dashboard: 'admin/dashboard',
  orders: 'admin/orders',
  products: 'admin/products',
  categories: 'admin/categories',
  payments: 'admin/payments',
  settings: 'admin/settings',
  'products/new': 'admin/product-form',
  'products/edit': 'admin/product-form',
};

function adminSubpath(slugParts) {
  if (!slugParts?.length) return 'dashboard';
  return slugParts.join('/');
}

function resolveAdminRoute(slugParts, query = {}) {
  const path = adminSubpath(slugParts);

  if (path === 'login') {
    return {
      path: 'login',
      view: 'admin/login',
      navPage: 'login',
      data: { page: 'login' },
      isLogin: true,
    };
  }

  if (path === 'products/edit' && !query.id) {
    return { redirect: '/admin/products' };
  }

  if (path === 'products/new') {
    return {
      path,
      view: 'admin/product-form',
      navPage: 'products',
      data: { page: 'products', formMode: 'new', productId: '' },
    };
  }

  if (path === 'products/edit') {
    return {
      path,
      view: 'admin/product-form',
      navPage: 'products',
      data: { page: 'products', formMode: 'edit', productId: String(query.id) },
    };
  }

  const top = slugParts[0] || '';
  if (slugParts.length > 1 || !VIEW_MAP[top]) {
    return null;
  }

  return {
    path: top,
    view: VIEW_MAP[top],
    navPage: top,
    data: { page: top },
  };
}

module.exports = {
  VIEW_MAP,
  adminSubpath,
  resolveAdminRoute,
};
