const { supabase } = require('./supabase');
const {
  getCartItems,
  addToCart,
  updateCartQty,
  removeFromCart,
  clearCart,
  validateCartStock,
} = require('./cart');
const { filterByProductParam } = require('./productQuery');
const { filterStoreCategories } = require('./catalogCategories');
const { getAccountData, updateProfile } = require('./accountService');
const { linkGuestOrders } = require('./orderLinking');
const { mapProduct } = require('./mapProduct');
const { mergePaymentSettings } = require('./paymentDefaults');
const { getStoreSettings, computeShipping } = require('./storeSettings');
const { trackOrderByNumber } = require('./orderTracking');
const {
  queueVerificationEmail,
  queueOrderConfirmationEmail,
} = require('./email/mailer');
const {
  registerUserWithVerification,
  resendVerificationLink,
  mapAuthError,
} = require('./auth/registerUser');
const { establishUserSessionFromToken } = require('./auth/oauthSession');
const { renderPageForNext } = require('./renderView');
const { getAccountPageData } = require('./storeData');

function json(status, body) {
  return { status, body };
}

function requireUserSession(req) {
  if (!req.session?.user?.id) {
    const err = new Error('লগইন প্রয়োজন');
    err.status = 401;
    throw err;
  }
}

async function handleApiRequest(method, segments, req, { query = {}, body = {} } = {}) {
  const path = segments.join('/');

  try {
    if (method === 'GET' && path === 'products') {
      const { q, category, flash, featured } = query;
      let dbQuery = supabase
        .from('products')
        .select('*, categories(slug, name_en, name_bn)')
        .order('created_at', { ascending: true });
      if (flash === '1') dbQuery = dbQuery.eq('is_flash_sale', true);
      else if (featured === '1') dbQuery = dbQuery.eq('is_featured', true);
      if (category && category !== 'all') {
        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category)
          .maybeSingle();
        if (cat) dbQuery = dbQuery.eq('category_id', cat.id);
      }
      const { data, error } = await dbQuery;
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
      return json(200, { products: items });
    }

    if (method === 'GET' && path === 'store-config') {
      const settings = await getStoreSettings();
      return json(200, { settings });
    }

    if (method === 'GET' && segments[0] === 'products' && segments[1]) {
      const { data, error } = await filterByProductParam(
        supabase.from('products').select('*, categories(slug, name_en, name_bn)'),
        segments[1]
      ).maybeSingle();
      if (error) throw error;
      if (!data) return json(404, { error: 'Not found' });
      return json(200, { product: mapProduct(data) });
    }

    if (method === 'GET' && path === 'categories') {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return json(200, { categories: filterStoreCategories(data) });
    }

    if (method === 'GET' && path === 'nav-context') {
      const items = await getCartItems(req).catch(() => []);
      const count = items.reduce((s, i) => s + i.qty, 0);
      const user = req.session?.user || null;
      return json(200, {
        cartCount: count,
        user: user
          ? { id: user.id, name: user.name || user.email, email: user.email }
          : null,
      });
    }

    if (method === 'GET' && path === 'cart') {
      const items = await getCartItems(req);
      const count = items.reduce((s, i) => s + i.qty, 0);
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      return json(200, { items, count, subtotal });
    }

    if (method === 'POST' && path === 'cart/add') {
      const { productId, quantity = 1, sizeLabel = '' } = body;
      await addToCart(req, productId, quantity, sizeLabel);
      const items = await getCartItems(req);
      return json(200, {
        ok: true,
        count: items.reduce((s, i) => s + i.qty, 0),
      });
    }

    if (method === 'PATCH' && segments[0] === 'cart' && segments[1]) {
      const delta = Number(body.delta || 0);
      await updateCartQty(req, segments[1], delta);
      const items = await getCartItems(req);
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      return json(200, {
        items,
        count: items.reduce((s, i) => s + i.qty, 0),
        subtotal,
      });
    }

    if (method === 'DELETE' && segments[0] === 'cart' && segments[1]) {
      await removeFromCart(req, segments[1]);
      const items = await getCartItems(req);
      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      return json(200, {
        items,
        count: items.reduce((s, i) => s + i.qty, 0),
        subtotal,
      });
    }

    if (method === 'GET' && path === 'payments') {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'payment_methods')
        .maybeSingle();
      return json(200, { payments: mergePaymentSettings(data?.value || {}) });
    }

    if (method === 'GET' && path === 'orders/track') {
      const result = await trackOrderByNumber(
        query.orderNumber || query.order
      );
      if (result.error) return json(404, { error: result.error });
      return json(200, result);
    }

    if (method === 'POST' && path === 'orders') {
      const items = await getCartItems(req);
      if (!items.length) return json(400, { error: 'Cart is empty' });

      try {
        await validateCartStock(req);
      } catch (stockErr) {
        return json(400, { error: stockErr.message });
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
      } = body;

      if (!shipping_name || !shipping_address) {
        return json(400, { error: 'Shipping name and address required' });
      }
      if (!payment_method || !['bkash', 'rocket', 'nagad'].includes(payment_method)) {
        return json(400, { error: 'bKash, Rocket, or Nagad payment required' });
      }
      if (!transaction_id || !payment_phone) {
        return json(400, { error: 'Transaction ID and payment phone required' });
      }

      const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      const storeSettings = await getStoreSettings();
      const shipping = computeShipping(subtotal, storeSettings);
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
            : body.customer_email
              ? String(body.customer_email).trim().toLowerCase()
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

      return json(200, { ok: true, orderNumber, orderId: order.id, total });
    }

    if (method === 'POST' && path === 'newsletter') {
      const { email } = body;
      if (!email) return json(400, { error: 'Email required' });
      const { error } = await supabase
        .from('newsletter_subscribers')
        .upsert({ email }, { onConflict: 'email' });
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (method === 'POST' && path === 'auth/register') {
      const { email, password, firstName, lastName } = body;
      if (!email || !password) {
        return json(400, { error: 'Email and password required' });
      }
      try {
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
        return json(200, {
          ok: true,
          message:
            'অ্যাকাউন্ট তৈরি হয়েছে! ইমেইলে পাঠানো যাচাই লিংকে ক্লিক করুন।',
        });
      } catch (err) {
        return json(400, { error: mapAuthError(err) });
      }
    }

    if (method === 'POST' && path === 'auth/resend-verification') {
      const { email, password } = body;
      if (!email || !password) {
        return json(400, { error: 'ইমেইল ও পাসওয়ার্ড প্রয়োজন' });
      }
      try {
        const { verificationUrl } = await resendVerificationLink({ email, password });
        queueVerificationEmail({ email, verificationUrl });
        return json(200, {
          ok: true,
          message: 'নতুন যাচাই লিংক ইমেইলে পাঠানো হয়েছে।',
        });
      } catch (err) {
        return json(400, { error: mapAuthError(err) });
      }
    }

    if (method === 'POST' && path === 'auth/login') {
      const { email, password } = body;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        const mapped = mapAuthError(error);
        const needsVerify =
          error.code === 'email_not_confirmed' ||
          (error.message || '').toLowerCase().includes('email not confirmed');
        return json(400, { error: mapped, needsVerification: needsVerify });
      }
      req.session.user = { id: data.user.id, email: data.user.email };
      let linked = [];
      try {
        linked = await linkGuestOrders(req.session.user, {
          sessionId: req.sessionID,
        });
      } catch (linkErr) {
        console.error('linkGuestOrders:', linkErr.message);
      }
      await req.session.save();
      return json(200, {
        ok: true,
        user: req.session.user,
        linkedOrders: linked.length,
      });
    }

    if (method === 'POST' && path === 'auth/oauth') {
      const { access_token: accessToken } = body;
      try {
        const result = await establishUserSessionFromToken(req, accessToken);
        return json(200, { ok: true, ...result });
      } catch (err) {
        return json(400, { error: err.message || 'Google sign-in failed' });
      }
    }

    if (method === 'POST' && path === 'auth/logout') {
      req.session.destroy();
      return json(200, { ok: true });
    }

    if (method === 'GET' && path === 'account/page') {
      requireUserSession(req);
      const data = await getAccountPageData(req);
      if (data.redirect) return json(401, { error: 'লগইন প্রয়োজন' });
      const rendered = await renderPageForNext('account/dashboard', data);
      return json(200, rendered);
    }

    if (method === 'GET' && path === 'account/data') {
      requireUserSession(req);
      const data = await getAccountData(req.session.user, {
        sessionId: req.sessionID,
        skipGuestLink: true,
      });
      return json(200, data);
    }

    if (method === 'PATCH' && path === 'account/profile') {
      requireUserSession(req);
      const updated = await updateProfile(req.session.user.id, body);
      return json(200, { ok: true, profile: updated });
    }

    return json(404, { error: 'Not found' });
  } catch (err) {
    const status = err.status || (err.message === 'লগইন প্রয়োজন' ? 401 : 500);
    return json(status, { error: err.message });
  }
}

module.exports = { handleApiRequest, mapProduct };
