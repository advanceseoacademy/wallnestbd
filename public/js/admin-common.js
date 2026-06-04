async function adminApi(path, options = {}) {
  const res = await fetch(`/admin/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function formatBDT(n) {
  return `৳${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatStatNum(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function paymentLabel(method) {
  return { bkash: 'bKash', rocket: 'Rocket', nagad: 'Nagad' }[method] || method || '-';
}

function paymentStatusBadge(status) {
  const map = {
    pending: ['pending', '🕐 পেন্ডিং'],
    submitted: ['processing', '📤 জমা হয়েছে'],
    verified: ['delivered', '✅ যাচাইকৃত'],
    rejected: ['cancelled', '❌ প্রত্যাখ্যান'],
  };
  const [cls, label] = map[status] || ['pending', status];
  return `<span class="status-badge ${cls}"><div class="status-dot"></div>${label}</span>`;
}

function updateClock() {
  const el = document.getElementById('dateChip');
  if (!el) return;
  const now = new Date();
  el.textContent = `📅 ${now.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })} · ${now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}`;
}

async function loadPendingBadge() {
  try {
    const { pendingPayments } = await adminApi('/stats');
    const badge = document.getElementById('navPendingOrders');
    if (badge && pendingPayments > 0) {
      badge.textContent = pendingPayments;
      badge.style.display = 'inline-block';
    }
  } catch (_) {}
}

setInterval(updateClock, 1000);
updateClock();
loadPendingBadge();
