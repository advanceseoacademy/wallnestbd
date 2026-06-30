const express = require('express');
const path = require('path');
const { supabase } = require('../lib/supabase');
const { adminQuery } = require('../lib/dbAdmin');
const { requireAdmin } = require('../middleware/adminAuth');
const { upload, uploadCategory } = require('../lib/upload');
const { resolveCategoryHeroUrl } = require('../lib/categoryHero');
const {
  filterAdminCategories,
  slugifyCategory,
  isCatalogCategory,
} = require('../lib/catalogCategories');
const { bustCatalog } = require('../lib/catalogCache');
const {
  normalizeProductImages,
  primaryImageUrl,
  resolveProductImagesForDb,
} = require('../lib/productImages');
const { resolveProductSlugForDb } = require('../lib/productSlug');
const { resolveProductSizesForDb, normalizeProductSizes } = require('../lib/productSizes');
const { processProductUpload, processCategoryUpload } = require('../lib/optimizeImage');
const { mergePaymentSettings } = require('../lib/paymentDefaults');

const router = express.Router();

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
    desc: p.description,
  };
}

// ── Auth pages ──
router.get('/login', (req, res) => {
  if (req.session?.admin) return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: null });
});

router.post('/login', express.urlencoded({ extended: true }), (req, res) => {
  const user = process.env.ADMIN_USERNAME || 'admin';
  const pass = process.env.ADMIN_PASSWORD || 'wallnest123';
  if (req.body.username === user && req.body.password === pass) {
    req.session.admin = { username: user };
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: 'ভুল ইউজারনেম বা পাসওয়ার্ড' });
});

router.post('/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

router.get('/', (req, res) => res.redirect('/admin/dashboard'));

// ── Admin pages ──
router.get('/dashboard', requireAdmin, (req, res) => {
  res.render('admin/dashboard', { page: 'dashboard', admin: req.session.admin });
});

router.get('/orders', requireAdmin, (req, res) => {
  res.render('admin/orders', { page: 'orders', admin: req.session.admin });
});

router.get('/products', requireAdmin, (req, res) => {
  res.render('admin/products', { page: 'products', admin: req.session.admin });
});

router.get('/categories', requireAdmin, (req, res) => {
  res.render('admin/categories', { page: 'categories', admin: req.session.admin });
});

router.get('/payments', requireAdmin, (req, res) => {
  res.render('admin/payments', { page: 'payments', admin: req.session.admin });
});

router.get('/settings', requireAdmin, (req, res) => {
  res.render('admin/settings', { page: 'settings', admin: req.session.admin });
});

// ── Admin API ──
const api = express.Router();
api.use(requireAdmin);

api.get('/stats', async (_req, res) => {
  try {
    const [{ data: orders }, { data: products }, { count: pendingPay }] =
      await Promise.all([
        supabase.from('orders').select('total, status, payment_status, created_at'),
        supabase.from('products').select('id, name_en, icon, image_url, price, stock'),
        supabase
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

    const { data: orderItems } = await supabase
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

    const { data: catalogCats } = await supabase
      .from('categories')
      .select('id, slug, name_en, name_bn, icon, catalog_share')
      .order('sort_order');
    const filteredCats = filterAdminCategories(catalogCats);

    const { data: allProducts } = await supabase
      .from('products')
      .select('category_id');

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

    res.json({
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/orders', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(product_name, product_icon, quantity, line_total)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    res.json({
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.patch('/orders/:id', async (req, res) => {
  try {
    const { status, payment_status } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (payment_status) updates.payment_status = payment_status;

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ ok: true, order: data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.get('/products', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name_en, slug)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ products: (data || []).map(mapAdminProduct) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.get('/categories', async (_req, res) => {
  try {
    const { data, error } = await supabase
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
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/categories', async (req, res) => {
  try {
    const b = req.body;
    const nameEn = (b.name_en || '').trim();
    if (!nameEn) return res.status(400).json({ error: 'ইংরেজি নাম প্রয়োজন' });

    let slug = (b.slug || slugifyCategory(nameEn)).trim().toLowerCase();
    if (!slug) return res.status(400).json({ error: 'স্লাগ প্রয়োজন' });
    if (slug === 'all' || !isCatalogCategory(slug)) {
      return res.status(400).json({ error: 'এই স্লাগ ব্যবহার করা যাবে না' });
    }

    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (existing) return res.status(400).json({ error: 'স্লাগ ইতিমধ্যে আছে' });

    const { data: last } = await supabase
      .from('categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase
      .from('categories')
      .insert({
        slug,
        name_en: nameEn,
        name_bn: (b.name_bn || '').trim() || null,
        icon: (b.icon || '🖼️').trim() || '🖼️',
        sort_order: Number(b.sort_order ?? (last?.sort_order ?? 0) + 1),
        catalog_share:
          b.catalog_share === '' || b.catalog_share == null
            ? null
            : Number(b.catalog_share),
        hero_image_url: (b.hero_image_url || '').trim() || null,
      })
      .select()
      .single();
    if (error) throw error;
    bustCatalog();
    res.json({ ok: true, category: data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.put('/categories/:id', async (req, res) => {
  try {
    const b = req.body;
    const { data: current, error: fetchErr } = await supabase
      .from('categories')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (fetchErr || !current) return res.status(404).json({ error: 'ক্যাটাগরি পাওয়া যায়নি' });
    if (!isCatalogCategory(current.slug)) {
      return res.status(400).json({ error: 'এই ক্যাটাগরি এডিট করা যাবে না' });
    }

    const nameEn = (b.name_en ?? current.name_en).trim();
    let slug = (b.slug ?? current.slug).trim().toLowerCase();
    if (!nameEn || !slug) return res.status(400).json({ error: 'নাম ও স্লাগ প্রয়োজন' });
    if (slug === 'all' || !isCatalogCategory(slug)) {
      return res.status(400).json({ error: 'এই স্লাগ ব্যবহার করা যাবে না' });
    }

    if (slug !== current.slug) {
      const { data: dup } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .neq('id', req.params.id)
        .maybeSingle();
      if (dup) return res.status(400).json({ error: 'স্লাগ ইতিমধ্যে আছে' });
    }

    const { data, error } = await supabase
      .from('categories')
      .update({
        slug,
        name_en: nameEn,
        name_bn: (b.name_bn ?? current.name_bn)?.trim() || null,
        icon: (b.icon ?? current.icon)?.trim() || '🖼️',
        sort_order: Number(b.sort_order ?? current.sort_order ?? 0),
        catalog_share:
          b.catalog_share === '' || b.catalog_share == null
            ? null
            : Number(b.catalog_share),
        hero_image_url:
          b.hero_image_url !== undefined
            ? (b.hero_image_url || '').trim() || null
            : current.hero_image_url,
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    bustCatalog();
    res.json({ ok: true, category: data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.delete('/categories/:id', async (req, res) => {
  try {
    const { data: current, error: fetchErr } = await supabase
      .from('categories')
      .select('slug')
      .eq('id', req.params.id)
      .single();
    if (fetchErr || !current) return res.status(404).json({ error: 'ক্যাটাগরি পাওয়া যায়নি' });
    if (!isCatalogCategory(current.slug)) {
      return res.status(400).json({ error: 'এই ক্যাটাগরি ডিলিট করা যাবে না' });
    }

    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', req.params.id);
    if (count > 0) {
      return res.status(400).json({
        error: `এই ক্যাটাগরিতে ${count}টি পণ্য আছে — আগে পণ্য সরান বা ডিলিট করুন`,
      });
    }

    const { error } = await supabase.from('categories').delete().eq('id', req.params.id);
    if (error) throw error;
    bustCatalog();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.post('/products', async (req, res) => {
  try {
    const b = req.body;
    const { images, image_url } = resolveProductImagesForDb(b);
    const slug = await resolveProductSlugForDb(b);
    const { sizes, price, original_price, stock } = resolveProductSizesForDb(b);
    const { data, error } = await supabase
      .from('products')
      .insert({
        name_en: b.name_en,
        name_bn: b.name_bn || null,
        description: b.description || null,
        category_id: b.category_id || null,
        icon: b.icon || '📦',
        slug,
        image_url,
        images,
        sizes,
        price,
        original_price,
        stock,
        badge: b.badge || 'new',
        is_featured: b.is_featured !== false,
        is_flash_sale: !!b.is_flash_sale,
        rating: Number(b.rating || 4.5),
        review_count: Number(b.review_count || 0),
      })
      .select()
      .single();
    if (error) throw error;
    bustCatalog();
    res.json({ ok: true, product: data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.put('/products/:id', async (req, res) => {
  try {
    const b = req.body;
    const { images, image_url } = resolveProductImagesForDb(b);
    const slug = await resolveProductSlugForDb(b, req.params.id);
    const { sizes, price, original_price, stock } = resolveProductSizesForDb(b);
    const { data, error } = await supabase
      .from('products')
      .update({
        name_en: b.name_en,
        name_bn: b.name_bn,
        description: b.description,
        category_id: b.category_id,
        icon: b.icon,
        slug,
        image_url,
        images,
        sizes,
        price,
        original_price,
        stock,
        badge: b.badge || null,
        is_featured: b.is_featured,
        is_flash_sale: b.is_flash_sale,
      })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    bustCatalog();
    res.json({ ok: true, product: data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.delete('/products/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    bustCatalog();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await processProductUpload(req.file.path);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Image optimize failed' });
  }
});

api.post('/upload/category-hero', uploadCategory.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const result = await processCategoryUpload(req.file.path);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Image optimize failed' });
  }
});

api.get('/settings/payments', async (_req, res) => {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'payment_methods')
    .maybeSingle();
  res.json({ payments: mergePaymentSettings(data?.value || {}) });
});

api.put('/settings/payments', async (req, res) => {
  try {
    const { error } = await supabase
      .from('site_settings')
      .upsert({
        key: 'payment_methods',
        value: req.body.payments,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      await adminQuery(
        `UPDATE site_settings SET value = $1::jsonb, updated_at = NOW() WHERE key = 'payment_methods'`,
        [JSON.stringify(req.body.payments)]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

api.get('/settings/shipping', async (_req, res) => {
  try {
    const bridge = require('../lib/adminApiBridge');
    res.json(await bridge.getShippingSettings());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.put('/settings/shipping', async (req, res) => {
  try {
    const bridge = require('../lib/adminApiBridge');
    res.json(await bridge.updateShippingSettings(req.body.shipping || {}));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.use('/api', api);

module.exports = router;
