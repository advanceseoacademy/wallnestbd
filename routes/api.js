const express = require('express');
const { supabase } = require('../lib/supabase');
const {
  getCartItems,
  addToCart,
  updateCartQty,
  removeFromCart,
  clearCart,
} = require('../lib/cart');
const { filterByProductParam } = require('../lib/productQuery');
const { filterStoreCategories } = require('../lib/catalogCategories');
const { requireUser } = require('../middleware/requireUser');
const { getAccountData, updateProfile } = require('../lib/accountService');
const { linkGuestOrders } = require('../lib/orderLinking');

const router = express.Router();

function mapProduct(p) {
  const cat = p.categories || {};
  return {
    id: p.legacy_id || p.id,
    uuid: p.id,
    name: p.name_en,
    nameBn: p.name_bn,
    cat: cat.name_en || 'General',
    catSlug: cat.slug,
    icon: p.icon || '📦',
    imageUrl: p.image_url || null,
    price: Number(p.price),
    original: Number(p.original_price || p.price),
    rating: Number(p.rating),
    reviews: p.review_count || 0,
    badge: p.badge,
    desc: p.description || '',
  };
}

router.get('/products', async (req, res) => {
  try {
    const { q, category, flash } = req.query;
    let query = supabase
      .from('products')
      .select('*, categories(slug, name_en, name_bn)')
      .order('created_at', { ascending: true });

    if (flash === '1') query = query.eq('is_flash_sale', true);
    else query = query.eq('is_featured', true);

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
    const { productId, quantity = 1 } = req.body;
    await addToCart(req, productId, quantity);
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
    res.json({
      items,
      count: items.reduce((s, i) => s + i.qty, 0),
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
    res.json({ payments: data?.value || {} });
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
    } = req.body;

    if (!shipping_name || !shipping_address) {
      return res.status(400).json({ error: 'Shipping name and address required' });
    }
    if (!payment_method || !['bkash', 'rocket', 'nagad'].includes(payment_method)) {
      return res.status(400).json({ error: 'bKash, Rocket, or Nagad payment required' });
    }
    if (!transaction_id || !payment_phone) {
      return res.status(400).json({ error: 'Transaction ID and payment phone required' });
    }

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = subtotal >= 1500 ? 0 : 80;
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
        payment_status: 'submitted',
        transaction_id,
        payment_phone,
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
      product_name: item.name,
      product_icon: item.icon,
      price: item.price,
      quantity: item.qty,
      line_total: item.price * item.qty,
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
    if (itemsErr) throw itemsErr;

    await clearCart(req);

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });
    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
      });
    }

    res.json({ ok: true, message: 'Check email to confirm account (if enabled)' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

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

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/account/data', requireUser, async (req, res) => {
  try {
    const data = await getAccountData(req.session.user, {
      sessionId: req.sessionID,
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
