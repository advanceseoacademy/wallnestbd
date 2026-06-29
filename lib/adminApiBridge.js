/**
 * Shared admin API logic — used by NestJS admin-api and legacy Express routes.
 */
const { supabase } = require('./supabase');
const { adminQuery } = require('./dbAdmin');
const { resolveCategoryHeroUrl } = require('./categoryHero');

async function getAdminDb() {
  const { ensureServiceRoleKey, getSupabaseAdmin } = require('./supabaseAdmin');
  await ensureServiceRoleKey();
  return getSupabaseAdmin();
}
const {
  filterAdminCategories,
  slugifyCategory,
  isCatalogCategory,
} = require('./catalogCategories');
const { bustCatalog } = require('./catalogCache');
const {
  normalizeProductImages,
  primaryImageUrl,
  resolveProductImagesForDb,
} = require('./productImages');
const { resolveProductSlugForDb } = require('./productSlug');
const { resolveProductSizesForDb, normalizeProductSizes } = require('./productSizes');
const { processProductUpload, processCategoryUpload } = require('./optimizeImage');
const { mergePaymentSettings } = require('./paymentDefaults');
const { sanitizeProductHtml } = require('./productDescription');
const { getNextLegacyId } = require('./productSku');

function mapAdminProduct(p) {
  const cat = p.categories || {};
  const images = normalizeProductImages(p.images, p.image_url);
  return {
    id: p.id,
    legacyId: p.legacy_id,
    name: p.name_en,
    nameBn: p.name_bn,
    cat: cat.name_en,
    catId: p.category_id,
    icon: p.icon,
    images,
    slug: p.slug,
    sizes: normalizeProductSizes(p.sizes, p),
    imageUrl: primaryImageUrl(images, p.image_url),
    price: Number(p.price),
    original: Number(p.original_price),
    stock: p.stock,
    badge: p.badge,
    featured: p.is_featured,
    flash: p.is_flash_sale,
    desc: p.description || '',
  };
}

async function getStats() {
  const db = await getAdminDb();
  const [{ data: orders }, { data: products }, { count: pendingPay }] =
    await Promise.all([
      db.from('orders').select('total, status, payment_status, created_at'),
      db.from('products').select('id, name_en, icon, image_url, price, stock'),
      db
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('payment_status', ['pending', 'submitted']),
    ]);

  const all = orders || [];
  const revenue = all
    .filter((o) => o.payment_status === 'verified' || o.status === 'confirmed')
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const today = new Date().toDateString();
  const todayOrders = all.filter(
    (o) => new Date(o.created_at).toDateString() === today
  ).length;

  const weekDays = ['সোম', 'মঙ্গল', 'বুধ', 'বৃহস্প', 'শুক্র', 'শনি', 'রবি'];
  const chart = weekDays.map((label, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    const dayTotal = all
      .filter((o) => new Date(o.created_at).toDateString() === dayStr)
      .reduce((s, o) => s + Number(o.total || 0), 0);
    return { label, value: Math.round(dayTotal) };
  });

  const { data: orderItems } = await db
    .from('order_items')
    .select('product_name, line_total, quantity, product_icon');

  const salesMap = {};
  (orderItems || []).forEach((item) => {
    if (!salesMap[item.product_name]) {
      salesMap[item.product_name] = {
        name: item.product_name,
        icon: item.product_icon || '📦',
        total: 0,
        qty: 0,
      };
    }
    salesMap[item.product_name].total += Number(item.line_total || 0);
    salesMap[item.product_name].qty += item.quantity || 0;
  });
  const topProducts = Object.values(salesMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const maxSales = topProducts[0]?.total || 1;

  const { data: catalogCats } = await db
    .from('categories')
    .select('id, slug, name_en, name_bn, icon, catalog_share')
    .order('sort_order');
  const filteredCats = filterAdminCategories(catalogCats);

  const { data: allProducts } = await db.from('products').select('category_id');
  const countByCategory = {};
  (allProducts || []).forEach((p) => {
    if (p.category_id) {
      countByCategory[p.category_id] = (countByCategory[p.category_id] || 0) + 1;
    }
  });

  const categories = (filteredCats || []).map((c) => ({
    name: c.name_en,
    nameBn: c.name_bn,
    icon: c.icon || '🖼️',
    slug: c.slug,
    pct: c.catalog_share,
    productCount: countByCategory[c.id] || 0,
  }));

  return {
    revenue,
    orderCount: all.length,
    todayOrders,
    pendingPayments: pendingPay || 0,
    productCount: (products || []).length,
    lowStock: (products || []).filter((p) => p.stock < 10).length,
    chart,
    topProducts: topProducts.map((p, i) => ({
      ...p,
      rank: i + 1,
      pct: Math.round((p.total / maxSales) * 100),
      sales: `৳${p.total.toLocaleString('bn-BD')}`,
    })),
    categories,
  };
}

async function getOrders() {
  const { data, error } = await (await getAdminDb())
    .from('orders')
    .select('*, order_items(product_name, product_icon, quantity, line_total)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return {
    orders: (data || []).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      customer: o.shipping_name,
      phone: o.shipping_phone,
      status: o.status,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      transactionId: o.transaction_id,
      total: Number(o.total),
      createdAt: o.created_at,
      items: o.order_items || [],
      firstProduct: o.order_items?.[0],
    })),
  };
}

async function patchOrder(id, body) {
  const { status, payment_status } = body;
  const updates = {};
  if (status) updates.status = status;
  if (payment_status) updates.payment_status = payment_status;
  const { data, error } = await (await getAdminDb())
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return { ok: true, order: data };
}

async function getProducts() {
  const { data, error } = await (await getAdminDb())
    .from('products')
    .select('*, categories(name_en, slug)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return { products: (data || []).map(mapAdminProduct) };
}

async function getProduct(id) {
  const { data, error } = await (await getAdminDb())
    .from('products')
    .select('*, categories(name_en, slug)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('পণ্য পাওয়া যায়নি');
  return { product: mapAdminProduct(data) };
}

async function getCategories() {
  const { data, error } = await (await getAdminDb())
    .from('categories')
    .select(
      'id, slug, name_en, name_bn, icon, sort_order, catalog_share, hero_image_url'
    )
    .order('sort_order');
  if (error) throw error;
  const categories = filterAdminCategories(data).map((c) => ({
    ...c,
    hero_image_url: c.hero_image_url || resolveCategoryHeroUrl(c),
  }));
  return { categories };
}

async function createCategory(body) {
  const nameEn = (body.name_en || '').trim();
  if (!nameEn) throw new Error('ইংরেজি নাম প্রয়োজন');
  let slug = (body.slug || slugifyCategory(nameEn)).trim().toLowerCase();
  if (!slug) throw new Error('স্লাগ প্রয়োজন');
  if (slug === 'all' || !isCatalogCategory(slug)) {
    throw new Error('এই স্লাগ ব্যবহার করা যাবে না');
  }
  const { data: existing } = await (await getAdminDb())
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) throw new Error('স্লাগ ইতিমধ্যে আছে');

  const { data: last } = await (await getAdminDb())
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await (await getAdminDb())
    .from('categories')
    .insert({
      slug,
      name_en: nameEn,
      name_bn: (body.name_bn || '').trim() || null,
      icon: (body.icon || '🖼️').trim() || '🖼️',
      sort_order: Number(body.sort_order ?? (last?.sort_order ?? 0) + 1),
      catalog_share:
        body.catalog_share === '' || body.catalog_share == null
          ? null
          : Number(body.catalog_share),
      hero_image_url: (body.hero_image_url || '').trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  bustCatalog();
  return { ok: true, category: data };
}

async function updateCategory(id, body) {
  const { data: current, error: fetchErr } = await (await getAdminDb())
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr || !current) throw new Error('ক্যাটাগরি পাওয়া যায়নি');
  if (!isCatalogCategory(current.slug)) {
    throw new Error('এই ক্যাটাগরি এডিট করা যাবে না');
  }

  const nameEn = (body.name_en ?? current.name_en).trim();
  let slug = (body.slug ?? current.slug).trim().toLowerCase();
  if (!nameEn || !slug) throw new Error('নাম ও স্লাগ প্রয়োজন');
  if (slug === 'all' || !isCatalogCategory(slug)) {
    throw new Error('এই স্লাগ ব্যবহার করা যাবে না');
  }

  if (slug !== current.slug) {
    const { data: dup } = await (await getAdminDb())
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .maybeSingle();
    if (dup) throw new Error('স্লাগ ইতিমধ্যে আছে');
  }

  const { data, error } = await (await getAdminDb())
    .from('categories')
    .update({
      slug,
      name_en: nameEn,
      name_bn: (body.name_bn ?? current.name_bn)?.trim() || null,
      icon: (body.icon ?? current.icon)?.trim() || '🖼️',
      sort_order: Number(body.sort_order ?? current.sort_order ?? 0),
      catalog_share:
        body.catalog_share === '' || body.catalog_share == null
          ? null
          : Number(body.catalog_share),
      hero_image_url:
        body.hero_image_url !== undefined
          ? (body.hero_image_url || '').trim() || null
          : current.hero_image_url,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  bustCatalog();
  return { ok: true, category: data };
}

async function deleteCategory(id) {
  const { data: current, error: fetchErr } = await (await getAdminDb())
    .from('categories')
    .select('slug')
    .eq('id', id)
    .single();
  if (fetchErr || !current) throw new Error('ক্যাটাগরি পাওয়া যায়নি');
  if (!isCatalogCategory(current.slug)) {
    throw new Error('এই ক্যাটাগরি ডিলিট করা যাবে না');
  }
  const { count } = await (await getAdminDb())
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);
  if (count > 0) {
    throw new Error(
      `এই ক্যাটাগরিতে ${count}টি পণ্য আছে — আগে পণ্য সরান বা ডিলিট করুন`
    );
  }
  const { error } = await (await getAdminDb()).from('categories').delete().eq('id', id);
  if (error) throw error;
  bustCatalog();
  return { ok: true };
}

async function createProduct(body) {
  const { images, image_url } = resolveProductImagesForDb(body);
  const slug = await resolveProductSlugForDb(body);
  const { sizes, price, original_price, stock } = resolveProductSizesForDb(body);
  const db = await getAdminDb();
  const legacy_id = await getNextLegacyId(db);
  const { data, error } = await db
    .from('products')
    .insert({
      legacy_id,
      name_en: body.name_en,
      name_bn: body.name_bn || null,
      description: sanitizeProductHtml(body.description) || null,
      category_id: body.category_id || null,
      icon: body.icon || '📦',
      slug,
      image_url,
      images,
      sizes,
      price,
      original_price,
      stock,
      badge: body.badge || 'new',
      is_featured: body.is_featured !== false,
      is_flash_sale: !!body.is_flash_sale,
      rating: Number(body.rating || 4.5),
      review_count: Number(body.review_count || 0),
    })
    .select()
    .single();
  if (error) throw error;
  bustCatalog();
  return { ok: true, product: data };
}

async function updateProduct(id, body) {
  const { images, image_url } = resolveProductImagesForDb(body);
  const slug = await resolveProductSlugForDb(body, id);
  const { sizes, price, original_price, stock } = resolveProductSizesForDb(body);
  const { data, error } = await (await getAdminDb())
    .from('products')
    .update({
      name_en: body.name_en,
      name_bn: body.name_bn,
      description: sanitizeProductHtml(body.description) || null,
      category_id: body.category_id,
      icon: body.icon,
      slug,
      image_url,
      images,
      sizes,
      price,
      original_price,
      stock,
      badge: body.badge || null,
      is_featured: body.is_featured,
      is_flash_sale: body.is_flash_sale,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('পণ্য আপডেট ব্যর্থ — ডাটাবেসে পণ্য পাওয়া যায়নি বা অনুমতি নেই');
    }
    throw error;
  }
  bustCatalog();
  return { ok: true, product: data };
}

async function deleteProduct(id) {
  const { error } = await (await getAdminDb()).from('products').delete().eq('id', id);
  if (error) throw error;
  bustCatalog();
  return { ok: true };
}

async function getPaymentSettings() {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'payment_methods')
    .maybeSingle();
  return { payments: mergePaymentSettings(data?.value || {}) };
}

async function updatePaymentSettings(payments) {
  const { error } = await (await getAdminDb()).from('site_settings').upsert({
    key: 'payment_methods',
    value: payments,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    await adminQuery(
      `UPDATE site_settings SET value = $1::jsonb, updated_at = NOW() WHERE key = 'payment_methods'`,
      [JSON.stringify(payments)]
    );
  }
  return { ok: true };
}

module.exports = {
  getStats,
  getOrders,
  patchOrder,
  getProducts,
  getProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getPaymentSettings,
  updatePaymentSettings,
  processProductUpload,
  processCategoryUpload,
};
