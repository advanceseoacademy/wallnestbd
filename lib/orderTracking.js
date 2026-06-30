const { supabase } = require('./supabase');

const STATUS_LABELS = {
  processing: '⏳ প্রসেসিং',
  shipped: '🚚 শিপমেন্টে',
  delivered: '✅ ডেলিভার্ড',
  cancelled: '❌ বাতিল',
};

const PAYMENT_LABELS = {
  pending: 'পেমেন্ট অপেক্ষায়',
  submitted: 'পেমেন্ট যাচাই হচ্ছে',
  verified: 'পেমেন্ট যাচাইকৃত',
  rejected: 'পেমেন্ট প্রত্যাখ্যান',
};

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

function trackingProgress(status, paymentStatus, paymentMethod) {
  if (status === 'cancelled') return 0;
  if (status === 'delivered') return 100;
  if (status === 'shipped') return 75;
  if (status === 'confirmed') return 45;
  if (paymentStatus === 'verified') return 35;
  if (paymentStatus === 'submitted') return 20;
  if (paymentMethod === 'cod' && paymentStatus === 'pending') return 20;
  return 12;
}

function formatOrderDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('bn-BD', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function deliveryAreaLabel(area) {
  if (area === 'outside_dhaka') return 'Outside Dhaka';
  if (area === 'inside_dhaka') return 'Inside Dhaka';
  return '';
}

function mapOrderForTracking(order) {
  const mappedStatus = mapOrderStatus(order.status);
  return {
    orderNumber: order.order_number,
    status: mappedStatus,
    rawStatus: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    shipping: Number(order.shipping),
    customerName: order.shipping_name,
    deliveryArea: deliveryAreaLabel(order.delivery_area),
    shippingAddress: [
      deliveryAreaLabel(order.delivery_area),
      order.shipping_address,
      order.shipping_city,
    ]
      .filter(Boolean)
      .join(', '),
    date: formatOrderDate(order.created_at),
    progress: trackingProgress(order.status, order.payment_status, order.payment_method),
    statusLabel: STATUS_LABELS[mappedStatus] || mappedStatus,
    paymentLabel: order.payment_method === 'cod' && order.payment_status === 'pending'
      ? 'ডেলিভারিতে ক্যাশ পেমেন্ট'
      : PAYMENT_LABELS[order.payment_status] || order.payment_status,
    items: (order.order_items || []).map((i) => ({
      name: i.product_name,
      icon: i.product_icon || '🖼️',
      qty: i.quantity,
      sizeLabel: i.size_label || '',
      lineTotal: Number(i.line_total),
    })),
  };
}

async function trackOrderByNumber(orderNumber) {
  const num = String(orderNumber || '').trim();
  if (!num) return { error: 'অর্ডার নম্বর লিখুন' };

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .ilike('order_number', num)
    .maybeSingle();

  if (error) throw error;
  if (!order) {
    return { error: 'অর্ডার পাওয়া যায়নি। অর্ডার নম্বর চেক করুন।' };
  }

  return { order: mapOrderForTracking(order) };
}

module.exports = {
  trackOrderByNumber,
  mapOrderForTracking,
  trackingProgress,
  mapOrderStatus,
  STATUS_LABELS,
  PAYMENT_LABELS,
};
