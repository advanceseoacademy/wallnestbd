function renderTrackingBar(status) {
  const p =
    status === 'delivered'
      ? 100
      : status === 'shipped'
        ? 55
        : status === 'processing'
          ? 28
          : status === 'cancelled'
            ? 0
            : 12;
  const step = (done, active, icon, label) => {
    let cls = 'pending';
    if (active) cls = 'active';
    else if (done) cls = 'done';
    return `<div class="track-step">
      <div class="track-dot ${cls}">${icon}</div>
      <div class="track-label ${done || active ? 'done' : ''}">${label}</div>
    </div>`;
  };
  return `
    ${step(p >= 12, false, p >= 12 ? '✓' : '○', 'অর্ডার<br>হয়েছে')}
    ${step(p >= 28, false, p >= 28 ? '✓' : '○', 'প্যাক<br>হয়েছে')}
    ${step(p >= 55, status === 'shipped', status === 'shipped' ? '🚚' : p >= 55 ? '✓' : '○', 'শিপমেন্টে')}
    ${step(p >= 100, false, '📍', 'ডেলিভারি')}`;
}

function formatMoney(n) {
  return `৳${Number(n || 0).toLocaleString('bn-BD')}`;
}

function setHidden(el, hidden) {
  if (!el) return;
  if (hidden) el.setAttribute('hidden', '');
  else el.removeAttribute('hidden');
}

function showError(msg) {
  const el = document.getElementById('trackError');
  if (!el) return;
  if (!msg) {
    setHidden(el, true);
    el.textContent = '';
    return;
  }
  el.textContent = msg;
  setHidden(el, false);
}

function renderOrderResult(order) {
  const result = document.getElementById('trackResult');
  if (!result) return;
  setHidden(result, false);
  showError('');

  const numEl = document.getElementById('resultOrderNumber');
  if (numEl) numEl.textContent = order.orderNumber;

  const pill = document.getElementById('resultStatusPill');
  if (pill) {
    pill.textContent = order.statusLabel || order.status;
    pill.className = `track-status-pill status-${order.status}`;
  }

  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text || '—';
  };

  set('resultDate', order.date);
  set('resultPayment', order.paymentLabel);
  set('resultTotal', formatMoney(order.total));
  set('resultCustomer', order.customerName);

  const addr = document.getElementById('resultAddress');
  if (addr) {
    addr.textContent = order.shippingAddress
      ? `📍 ${order.shippingAddress}`
      : '';
    addr.style.display = order.shippingAddress ? '' : 'none';
  }

  const wrap = document.getElementById('trackProgressWrap');
  const bar = document.getElementById('trackingBar');
  if (order.status === 'cancelled') {
    if (wrap) wrap.style.display = 'none';
  } else {
    if (wrap) wrap.style.display = '';
    if (bar) {
      bar.innerHTML = renderTrackingBar(order.status);
      bar.style.setProperty('--track-pct', `${order.progress || 12}%`);
    }
  }

  const list = document.getElementById('trackItemsList');
  if (list) {
    const items = order.items || [];
    list.innerHTML = items.length
      ? items
          .map(
            (i) => `<li class="track-item">
          <span class="track-item-icon">${i.icon || '🖼️'}</span>
          <div class="track-item-info">
            <div class="track-item-name">${i.name}${i.sizeLabel ? ` <small>(${i.sizeLabel})</small>` : ''}</div>
            <div class="track-item-meta">পরিমাণ: ${i.qty} × ${formatMoney(i.lineTotal / (i.qty || 1))}</div>
          </div>
          <div class="track-item-total">${formatMoney(i.lineTotal)}</div>
        </li>`
          )
          .join('')
      : '<li class="track-item-empty">কোনো আইটেম নেই</li>';
  }

  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function trackOrder(orderNumber) {
  const btn = document.getElementById('trackSubmitBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'খুঁজছি...';
  }
  showError('');
  try {
    const qs = new URLSearchParams({
      orderNumber: String(orderNumber || '').trim(),
    });
    const res = await fetch(`/api/orders/track?${qs}`, { credentials: 'same-origin' });
    const data = await res.json();
    if (!res.ok) {
      showError(data.error || 'অর্ডার খুঁজে পাওয়া যায়নি');
      setHidden(document.getElementById('trackResult'), true);
      return;
    }
    renderOrderResult(data.order);
  } catch (err) {
    showError(err.message || 'সার্ভার ত্রুটি — আবার চেষ্টা করুন');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔍 স্ট্যাটাস দেখুন';
    }
  }
}

function initTrackOrderPage() {
  const form = document.getElementById('trackOrderForm');
  if (!form || form.dataset.trackBound) return;
  form.dataset.trackBound = '1';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const orderNumber = document.getElementById('trackOrderNumber')?.value;
    trackOrder(orderNumber);
  });

  const params = new URLSearchParams(window.location.search);
  const order = params.get('order') || params.get('orderNumber') || '';
  if (order) {
    const orderInput = document.getElementById('trackOrderNumber');
    if (orderInput && !orderInput.value) orderInput.value = order;
    trackOrder(order);
  }
}

window.initTrackOrderPage = initTrackOrderPage;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTrackOrderPage);
} else {
  initTrackOrderPage();
}
