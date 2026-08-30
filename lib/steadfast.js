/**
 * Steadfast Courier (portal.packzy.com) API client + order sync helpers.
 * Credentials live in .env — never hardcode them here.
 */
require('dotenv').config();
const { supabase } = require('./supabase');

const BASE_URL = (process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1').replace(
  /\/+$/,
  ''
);
const REQUEST_TIMEOUT_MS = 15000;

/** How long a cached courier status stays fresh before we hit the API again. */
const STATUS_TTL_MS = 10 * 60 * 1000;

/** Statuses that will never change again, so we stop polling Steadfast for them. */
const FINAL_STATUSES = new Set(['delivered', 'partial_delivered', 'cancelled']);

const STATUS_LABELS = {
  in_review: '📋 কুরিয়ারে বুক হয়েছে',
  pending: '⏳ কুরিয়ার প্রসেসিং',
  hold: '⏸️ কুরিয়ারে হোল্ড',
  delivered_approval_pending: '📦 ডেলিভার্ড (অনুমোদনের অপেক্ষায়)',
  partial_delivered_approval_pending: '📦 আংশিক ডেলিভার্ড (অনুমোদনের অপেক্ষায়)',
  cancelled_approval_pending: '❌ বাতিল (অনুমোদনের অপেক্ষায়)',
  unknown_approval_pending: '❓ অজানা (অনুমোদনের অপেক্ষায়)',
  delivered: '✅ ডেলিভার্ড',
  partial_delivered: '📦 আংশিক ডেলিভার্ড',
  cancelled: '❌ কুরিয়ারে বাতিল',
  unknown: '❓ অজানা স্ট্যাটাস',
};

function configured() {
  return Boolean(process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY);
}

/** Auto-booking is opt-out so a fake-order spike can be stopped without a deploy. */
function autoCreateEnabled() {
  return configured() && process.env.STEADFAST_AUTO_CREATE !== 'false';
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status || '';
}

/** Steadfast delivery status -> our internal orders.status value. */
function mapCourierStatusToOrderStatus(courierStatus) {
  if (courierStatus === 'delivered' || courierStatus === 'partial_delivered') return 'delivered';
  if (courierStatus === 'cancelled') return 'cancelled';
  if (courierStatus === 'in_review' || courierStatus === 'pending' || courierStatus === 'hold') {
    return 'shipped';
  }
  return null;
}

async function request(path, { method = 'GET', body } = {}) {
  if (!configured()) throw new Error('Steadfast API credentials are not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Api-Key': process.env.STEADFAST_API_KEY,
        'Secret-Key': process.env.STEADFAST_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Steadfast returned a non-JSON response (HTTP ${res.status})`);
    }

    if (!res.ok || (data.status && Number(data.status) >= 400)) {
      const detail =
        data.message ||
        (data.errors ? Object.values(data.errors).flat().join(', ') : '') ||
        `HTTP ${res.status}`;
      throw new Error(detail);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Steadfast API request timed out');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Steadfast requires exactly 11 digits, so strip +88/88 prefixes and separators. */
function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('88') && digits.length > 11) digits = digits.slice(2);
  return digits;
}

function buildConsignmentPayload(order, items) {
  const phone = normalizePhone(order.shipping_phone || order.payment_phone);
  if (phone.length !== 11) {
    throw new Error(`কুরিয়ারের জন্য ১১ ডিজিটের ফোন নম্বর দরকার (পাওয়া গেছে: "${order.shipping_phone || ''}")`);
  }

  const address = [order.shipping_address, order.shipping_city].filter(Boolean).join(', ');
  if (!address) throw new Error('কুরিয়ারের জন্য ডেলিভারি ঠিকানা দরকার');

  // Only COD orders should collect money at the door; prepaid ones are already paid.
  const codAmount = order.payment_method === 'cod' ? Number(order.total) || 0 : 0;

  const description = (items || [])
    .map((i) => `${i.product_name || i.name} x${i.quantity || i.qty || 1}`)
    .join(', ');

  return {
    invoice: order.order_number,
    recipient_name: String(order.shipping_name || 'Customer').slice(0, 100),
    recipient_phone: phone,
    recipient_address: address.slice(0, 250),
    cod_amount: codAmount,
    note: order.customer_note || undefined,
    item_description: description ? description.slice(0, 250) : undefined,
    delivery_type: 0,
  };
}

async function getBalance() {
  const data = await request('/get_balance');
  return { balance: Number(data.current_balance) || 0 };
}

async function getStatusByConsignmentId(consignmentId) {
  const data = await request(`/status_by_cid/${encodeURIComponent(consignmentId)}`);
  return data.delivery_status || null;
}

async function getStatusByInvoice(invoice) {
  const data = await request(`/status_by_invoice/${encodeURIComponent(invoice)}`);
  return data.delivery_status || null;
}

/**
 * Book a consignment for an order and persist the courier fields.
 * Safe to call twice — an order that already has a consignment is returned as-is.
 */
async function createConsignmentForOrder(order, items) {
  if (order.courier_consignment_id) {
    return {
      ok: true,
      alreadySent: true,
      consignmentId: order.courier_consignment_id,
      trackingCode: order.courier_tracking_code,
    };
  }

  try {
    const payload = buildConsignmentPayload(order, items);
    const data = await request('/create_order', { method: 'POST', body: payload });
    const consignment = data.consignment || {};

    const { error: saveErr } = await supabase
      .from('orders')
      .update({
        courier_consignment_id: consignment.consignment_id || null,
        courier_tracking_code: consignment.tracking_code || null,
        courier_status: consignment.status || 'in_review',
        courier_synced_at: new Date().toISOString(),
        courier_error: null,
      })
      .eq('id', order.id);

    // The parcel exists at Steadfast either way, so surface a save failure loudly
    // rather than losing the tracking code.
    if (saveErr) {
      console.error(
        '[steadfast] consignment',
        consignment.consignment_id,
        'created for',
        order.order_number,
        'but saving it failed —',
        saveErr.message
      );
      return {
        ok: false,
        error: `কুরিয়ারে পার্সেল তৈরি হয়েছে (ট্র্যাকিং ${consignment.tracking_code}) কিন্তু ডাটাবেসে সেভ হয়নি: ${saveErr.message}`,
      };
    }

    return {
      ok: true,
      consignmentId: consignment.consignment_id,
      trackingCode: consignment.tracking_code,
      status: consignment.status || 'in_review',
    };
  } catch (err) {
    // Record the failure so the admin panel can show a retry button with a reason.
    await supabase
      .from('orders')
      .update({ courier_error: err.message, courier_synced_at: new Date().toISOString() })
      .eq('id', order.id);
    return { ok: false, error: err.message };
  }
}

/**
 * Refresh a single order's courier status when the cached value is stale.
 * Returns the (possibly unchanged) courier status.
 */
async function syncOrderStatus(order, { force = false } = {}) {
  if (!configured() || !order?.courier_consignment_id) return order?.courier_status || null;
  if (FINAL_STATUSES.has(order.courier_status)) return order.courier_status;

  const lastSync = order.courier_synced_at ? new Date(order.courier_synced_at).getTime() : 0;
  if (!force && Date.now() - lastSync < STATUS_TTL_MS) return order.courier_status;

  try {
    const courierStatus = await getStatusByConsignmentId(order.courier_consignment_id);
    if (!courierStatus) return order.courier_status;

    const updates = {
      courier_status: courierStatus,
      courier_synced_at: new Date().toISOString(),
    };

    // Keep our own order status in step, but never overwrite a manual cancellation.
    const mapped = mapCourierStatusToOrderStatus(courierStatus);
    if (mapped && mapped !== order.status && order.status !== 'cancelled') {
      updates.status = mapped;
    }

    await supabase.from('orders').update(updates).eq('id', order.id);
    return courierStatus;
  } catch (err) {
    console.error('[steadfast] status sync failed for', order.order_number, '—', err.message);
    return order.courier_status;
  }
}

/** Refresh every order that still has a non-final courier status. */
async function syncPendingOrders(orders) {
  const stale = (orders || []).filter(
    (o) => o.courier_consignment_id && !FINAL_STATUSES.has(o.courier_status)
  );
  if (!stale.length) return {};

  const results = await Promise.allSettled(stale.map((o) => syncOrderStatus(o)));
  const byId = {};
  stale.forEach((order, i) => {
    const r = results[i];
    byId[order.id] = r.status === 'fulfilled' ? r.value : order.courier_status;
  });
  return byId;
}

/** Fire-and-forget booking used right after an order is placed. */
function queueConsignmentForOrder(order, items) {
  if (!autoCreateEnabled()) return;
  createConsignmentForOrder(order, items)
    .then((result) => {
      if (result.ok) {
        console.log(
          '[steadfast] consignment created for',
          order.order_number,
          '— tracking',
          result.trackingCode
        );
      } else {
        console.warn('[steadfast] consignment failed for', order.order_number, '—', result.error);
      }
    })
    .catch((err) => {
      console.error('[steadfast] consignment error for', order.order_number, '—', err.message);
    });
}

module.exports = {
  configured,
  autoCreateEnabled,
  statusLabel,
  mapCourierStatusToOrderStatus,
  getBalance,
  getStatusByConsignmentId,
  getStatusByInvoice,
  createConsignmentForOrder,
  syncOrderStatus,
  syncPendingOrders,
  queueConsignmentForOrder,
  FINAL_STATUSES,
  STATUS_LABELS,
};
