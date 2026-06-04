const { supabase } = require('./supabase');
const { adminQuery } = require('./dbAdmin');
const { linkGuestOrders } = require('./orderLinking');

function mapOrderStatus(status) {
  const map = {
    pending: 'processing',
    confirmed: 'processing',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };
  return map[status] || 'processing';
}

function formatOrderDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCouponExpiry(iso) {
  if (!iso) return 'সর্বক্ষণ';
  return new Date(iso).toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function mapOrderRow(o) {
  const firstItem = (o.order_items || [])[0];
  return {
    id: o.order_number || o.id.slice(0, 8),
    orderId: o.id,
    icon: firstItem?.product_icon || '🖼️',
    name: firstItem?.product_name || 'WallNest Order',
    itemCount: (o.order_items || []).length,
    price: Number(o.total || 0),
    status: mapOrderStatus(o.status),
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    date: formatOrderDate(o.created_at),
    createdAt: o.created_at,
    shipping: {
      name: o.shipping_name,
      phone: o.shipping_phone,
      address: o.shipping_address,
      city: o.shipping_city,
      zip: o.shipping_zip,
    },
    items: (o.order_items || []).map((i) => ({
      name: i.product_name,
      icon: i.product_icon || '🖼️',
      qty: i.quantity,
      lineTotal: Number(i.line_total || 0),
    })),
  };
}

function mapCouponRow(c) {
  let pct = c.discount_value;
  if (c.discount_type === 'free_shipping') pct = 'FREE';
  else if (c.discount_type === 'fixed') pct = Number(c.discount_value);
  else pct = Number(c.discount_value);

  return {
    code: c.code,
    pct,
    desc: c.description_bn || c.description_en || c.code,
    expiry: formatCouponExpiry(c.expires_at),
    minOrder: Number(c.min_order_amount || 0),
  };
}

async function loadProfile(userId) {
  try {
    const rows = await adminQuery('SELECT * FROM profiles WHERE id = $1 LIMIT 1', [userId]);
    if (rows?.[0]) return rows[0];
  } catch (_) {
    /* admin API optional */
  }
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data || { id: userId, first_name: '', last_name: '', phone: '' };
}

async function loadActiveCoupons() {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data || [])
    .filter((c) => !c.expires_at || c.expires_at > now)
    .map(mapCouponRow);
}

async function loadExperienceRating(ordersRaw) {
  const productIds = new Set();
  (ordersRaw || []).forEach((o) => {
    (o.order_items || []).forEach((i) => {
      if (i.product_id) productIds.add(i.product_id);
    });
  });

  let query = supabase.from('reviews').select('rating');
  if (productIds.size) {
    query = query.in('product_id', [...productIds]);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return null;

  const sum = data.reduce((s, r) => s + Number(r.rating), 0);
  return Math.round((sum / data.length) * 10) / 10;
}

async function fetchUserOrders(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getAccountData(user, options = {}) {
  const profile = await loadProfile(user.id);

  await linkGuestOrders(user, {
    sessionId: options.sessionId,
    profilePhone: profile.phone,
  });

  const ordersRaw = await fetchUserOrders(user.id);
  const orders = ordersRaw.map(mapOrderRow);

  const firstName = profile.first_name || '';
  const lastName = profile.last_name || '';
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') ||
    orders[0]?.shipping?.name ||
    user.email?.split('@')[0] ||
    'গ্রাহক';

  const initials = displayName.slice(0, 2);
  const totalSpent = orders
    .filter((o) => o.status === 'delivered' || o.paymentStatus === 'verified')
    .reduce((s, o) => s + o.price, 0);
  const points = Math.floor(totalSpent / 100) + orders.length * 50;
  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  ).length;

  const experienceRating = await loadExperienceRating(ordersRaw);

  const addresses = [];
  const seen = new Set();
  orders.forEach((o) => {
    const key = `${o.shipping?.address}|${o.shipping?.phone}`;
    if (!o.shipping?.address || seen.has(key)) return;
    seen.add(key);
    addresses.push({
      name: o.shipping.name || displayName,
      phone: o.shipping.phone || profile.phone || '',
      address: o.shipping.address,
      city: o.shipping.city,
      zip: o.shipping.zip,
      isDefault: addresses.length === 0,
    });
  });

  const notifications = buildNotifications(orders);
  const latestActive = orders.find((o) =>
    ['shipped', 'processing'].includes(o.status)
  );

  const coupons = await loadActiveCoupons();

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName,
      initials,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      phone: profile.phone || orders[0]?.shipping?.phone || '',
      tier: orders.length >= 8 ? 'প্লাটিনাম' : orders.length >= 3 ? 'গোল্ড' : 'সিলভার',
      memberSince: profile.created_at
        ? new Date(profile.created_at).toLocaleDateString('bn-BD', {
            month: 'long',
            year: 'numeric',
          })
        : 'WallNest BD',
    },
    stats: {
      orderCount: orders.length,
      points,
      activeOrders,
      totalSpent,
      experienceRating,
      reviewCount: null,
    },
    orders,
    addresses,
    notifications,
    tracking: latestActive
      ? {
          orderId: latestActive.id,
          name: latestActive.name,
          status: latestActive.status,
          progress: trackingProgress(latestActive.status),
        }
      : null,
    coupons,
  };
}

function trackingProgress(status) {
  if (status === 'delivered') return 100;
  if (status === 'shipped') return 55;
  if (status === 'processing') return 28;
  return 12;
}

function buildNotifications(orders) {
  const list = [];
  orders.slice(0, 5).forEach((o) => {
    if (o.status === 'shipped') {
      list.push({
        icon: '📦',
        color: 'blue',
        text: `<strong>${o.id}</strong> শিপমেন্টে আছে — ট্র্যাক করুন।`,
        time: o.date,
        unread: true,
      });
    } else if (o.paymentStatus === 'verified') {
      list.push({
        icon: '✅',
        color: 'green',
        text: `<strong>${o.id}</strong> পেমেন্ট যাচাই হয়েছে।`,
        time: o.date,
        unread: false,
      });
    } else if (o.paymentStatus === 'submitted') {
      list.push({
        icon: '💳',
        color: 'amber',
        text: `<strong>${o.id}</strong> পেমেন্ট যাচাইয়ের অপেক্ষায়।`,
        time: o.date,
        unread: true,
      });
    }
  });
  if (!list.length) {
    list.push({
      icon: '🖼️',
      color: 'blue',
      text: 'WallNest BD-তে স্বাগতম! আপনার প্রথম ওয়াল আর্ট অর্ডার করুন।',
      time: 'এখন',
      unread: true,
    });
  }
  return list.slice(0, 8);
}

async function updateProfile(userId, body) {
  const first = String(body.firstName ?? body.first_name ?? '').trim();
  const last = String(body.lastName ?? body.last_name ?? '').trim();
  const phone = String(body.phone ?? '').trim();

  if (!first && !last) {
    throw new Error('প্রথম নাম বা শেষ নাম প্রয়োজন');
  }
  if (!phone) {
    throw new Error('ফোন নম্বর প্রয়োজন');
  }

  const payload = {
    id: userId,
    first_name: first,
    last_name: last,
    phone,
    updated_at: new Date().toISOString(),
  };

  try {
    await adminQuery(
      `INSERT INTO profiles (id, first_name, last_name, phone, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         phone = EXCLUDED.phone,
         updated_at = NOW()`,
      [userId, payload.first_name, payload.last_name, payload.phone]
    );
    return payload;
  } catch (adminErr) {
    const { error } = await supabase.from('profiles').upsert(payload);
    if (error) {
      const hint =
        adminErr.message?.includes('ACCESS_TOKEN') ||
        error.code === '42501'
          ? 'সার্ভারে SUPABASE_ACCESS_TOKEN সেট করুন (প্রোফাইল সেভের জন্য)।'
          : '';
      throw new Error(
        [error.message || adminErr.message, hint].filter(Boolean).join(' ')
      );
    }
    return payload;
  }
}

module.exports = { getAccountData, updateProfile, mapOrderRow, linkGuestOrders };
