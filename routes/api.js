const express = require('express');
const { supabase } = require('../lib/supabase');
const {
  getCartItems,
  addToCart,
  updateCartQty,
  removeFromCart,
  clearCart,
  validateCartStock,
} = require('../lib/cart');
const { filterByProductParam } = require('../lib/productQuery');
const { mergePaymentSettings } = require('../lib/paymentDefaults');
const { getStoreSettings, computeShipping, normalizeDeliveryArea } = require('../lib/storeSettings');
const { trackOrderByNumber } = require('../lib/orderTracking');
const { filterStoreCategories } = require('../lib/catalogCategories');
const { requireUser } = require('../middleware/requireUser');
const { getAccountData, updateProfile } = require('../lib/accountService');
const { linkGuestOrders } = require('../lib/orderLinking');
const { mapProduct } = require('../lib/mapProduct');
const {
  queueVerificationEmail,
  queueOrderConfirmationEmail,
} = require('../lib/email/mailer');
const {
  registerUserWithVerification,
  resendVerificationLink,
  mapAuthError,
} = require('../lib/auth/registerUser');
const { establishUserSessionFromToken } = require('../lib/auth/oauthSession');
const { renderPageForNext } = require('../lib/renderView');
const { getAccountPageData } = require('../lib/storeData');

const router = express.Router();

router.get('/products', async (req, res) => {
  try {
    const { q, category, flash, featured } = req.query;
    let query = supabase
      .from('products')
      .select('*, categories(slug, name_en, name_bn)')
      .order('created_at', { ascending: true });

    if (flash === '1') query = query.eq('is_flash_sale', true);
    else if (featured === '1') query = query.eq('is_featured', true);

    if (category && category !== 'all') {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category)
        .maybeSingle();
      if (cat) query = query.eq('category_id', cat.id);
    }

    const { data, error } = await query;
    if (error) throw error;

    let items = (data || []).map(mapProduct);
    if (q) {
      const term = String(q).toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.nameBn && p.nameBn.includes(term)) ||
          p.cat.toLowerCase().includes(term)
      );
    }

    res.json({ products: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const { data, error } = await filterByProductParam(
      supabase.from('products').select('*, categories(slug, name_en, name_bn)'),
      req.params.id
    ).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json({ product: mapProduct(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order');
    if (error) throw error;
    res.json({ categories: filterStoreCategories(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cart', async (req, res) => {
  try {
    const items = await getCartItems(req);
    const count = items.reduce((s, i) => s + i.qty, 0);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    res.json({ items, count, subtotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cart/add', async (req, res) => {
  try {
    const { productId, quantity = 1, sizeLabel = '' } = req.body;
    await addToCart(req, productId, quantity, sizeLabel);
    const items = await getCartItems(req);
    res.json({
      ok: true,
      count: items.reduce((s, i) => s + i.qty, 0),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/cart/:cartItemId', async (req, res) => {
  try {
    const delta = Number(req.body.delta || 0);
    await updateCartQty(req, req.params.cartItemId, delta);
    const items = await getCartItems(req);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    res.json({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/cart/:cartItemId', async (req, res) => {
  try {
    await removeFromCart(req, req.params.cartItemId);
    const items = await getCartItems(req);
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    res.json({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
      subtotal,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/payments', async (_req, res) => {
  try {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'payment_methods')
      .maybeSingle();
    res.json({ payments: mergePaymentSettings(data?.value || {}) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/track', async (req, res) => {
  try {
    const result = await trackOrderByNumber(
      req.query.orderNumber || req.query.order
    );
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const items = await getCartItems(req);
    if (!items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    try {
      await validateCartStock(req);
    } catch (stockErr) {
      return res.status(400).json({ error: stockErr.message });
    }

    const {
      shipping_name,
      shipping_phone,
      shipping_address,
      shipping_city,
      shipping_zip,
      payment_method,
      transaction_id,
      payment_phone,
      customer_note,
      delivery_area,
    } = req.body;

    if (!shipping_name || !shipping_address) {
      return res.status(400).json({ error: 'Shipping name and address required' });
    }
    if (!delivery_area || !['inside_dhaka', 'outside_dhaka'].includes(delivery_area)) {
      return res.status(400).json({ error: 'Delivery area is required' });
    }
    if (!payment_method || !['bkash', 'rocket', 'nagad', 'cod'].includes(payment_method)) {
      return res.status(400).json({ error: 'Valid payment method required' });
    }
    if (payment_method !== 'cod' && (!transaction_id || !payment_phone)) {
      return res.status(400).json({ error: 'Transaction ID and payment phone required' });
    }

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const storeSettings = await getStoreSettings();
    const shipping = computeShipping(subtotal, storeSettings, normalizeDeliveryArea(delivery_area));
    const total = subtotal + shipping;
    const orderNumber = `WN-${Date.now().toString(36).toUpperCase()}`;

    const owner = req.session?.user?.id
      ? { user_id: req.session.user.id, session_id: null }
      : { user_id: null, session_id: req.sessionID };

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        ...owner,
        order_number: orderNumber,
        status: 'pending',
        payment_method,
        payment_status: payment_method === 'cod' ? 'pending' : 'submitted',
        transaction_id: payment_method === 'cod' ? null : transaction_id,
        payment_phone: payment_method === 'cod' ? (shipping_phone || null) : payment_phone,
        customer_note: customer_note || null,
        currency: 'BDT',
        subtotal,
        shipping,
        total,
        shipping_name,
        shipping_phone: shipping_phone || payment_phone,
        shipping_address,
        shipping_city: shipping_city || null,
        shipping_zip: shipping_zip || null,
        delivery_area: normalizeDeliveryArea(delivery_area),
        customer_email: req.session?.user?.email
          ? String(req.session.user.email).trim().toLowerCase()
          : req.body.customer_email
            ? String(req.body.customer_email).trim().toLowerCase()
            : null,
      })
      .select()
      .single();
    if (orderErr) throw orderErr;

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.displayName || item.name,
      product_icon: item.icon,
      size_label: item.sizeLabel || null,
      price: item.price,
      quantity: item.qty,
      line_total: item.price * item.qty,
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
    if (itemsErr) throw itemsErr;

    await clearCart(req);

    queueOrderConfirmationEmail(order, orderItems);

    res.json({
      ok: true,
      orderNumber,
      orderId: order.id,
      total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const { error } = await supabase
      .from('newsletter_subscribers')
      .upsert({ email }, { onConflict: 'email' });
    if (error) throw error;

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { verificationUrl } = await registerUserWithVerification({
      email,
      password,
      firstName,
      lastName,
    });
    queueVerificationEmail({
      email,
      firstName,
      lastName,
      verificationUrl,
    });

    res.json({
      ok: true,
      message: 'অ্যাকাউন্ট তৈরি হয়েছে! ইমেইলে পাঠানো যাচাই লিংকে ক্লিক করুন।',
    });
  } catch (err) {
    res.status(400).json({ error: mapAuthError(err) });
  }
});

router.post('/auth/resend-verification', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'ইমেইল ও পাসওয়ার্ড প্রয়োজন' });
    }

    const { verificationUrl } = await resendVerificationLink({ email, password });
    queueVerificationEmail({ email, verificationUrl });

    res.json({
      ok: true,
      message: 'নতুন যাচাই লিংক ইমেইলে পাঠানো হয়েছে।',
    });
  } catch (err) {
    res.status(400).json({ error: mapAuthError(err) });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      const needsVerify =
        error.code === 'email_not_confirmed' ||
        (error.message || '').toLowerCase().includes('email not confirmed');
      return res.status(400).json({
        error: mapAuthError(error),
        needsVerification: needsVerify,
      });
    }

    req.session.user = {
      id: data.user.id,
      email: data.user.email,
    };

    let linked = [];
    try {
      linked = await linkGuestOrders(req.session.user, {
        sessionId: req.sessionID,
      });
    } catch (linkErr) {
      console.error('linkGuestOrders:', linkErr.message);
    }

    res.json({
      ok: true,
      user: req.session.user,
      linkedOrders: linked.length,
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/auth/oauth', async (req, res) => {
  try {
    const { access_token: accessToken } = req.body;
    const result = await establishUserSessionFromToken(req, accessToken);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Google sign-in failed' });
  }
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/account/page', requireUser, async (req, res) => {
  try {
    const data = await getAccountPageData(req);
    if (data.redirect) {
      return res.status(401).json({ error: 'লগইন প্রয়োজন' });
    }
    const rendered = await renderPageForNext('account/dashboard', data);
    res.json(rendered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/account/data', requireUser, async (req, res) => {
  try {
    const data = await getAccountData(req.session.user, {
      sessionId: req.sessionID,
      skipGuestLink: true,
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/account/profile', requireUser, async (req, res) => {
  try {
    const updated = await updateProfile(req.session.user.id, req.body);
    res.json({ ok: true, profile: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
