(function () {
  const ORDER_STATUSES = [
    { value: 'pending', label: 'পেন্ডিং' },
    { value: 'confirmed', label: 'কনফার্মড' },
    { value: 'shipped', label: 'শিপড' },
    { value: 'delivered', label: 'ডেলিভার্ড' },
    { value: 'cancelled', label: 'ক্যানসেলড' },
  ];

  function statusSelect(order) {
    const current = order.status || 'pending';
    const options = ORDER_STATUSES.map(
      (s) =>
        `<option value="${s.value}"${s.value === current ? ' selected' : ''}>${s.label}</option>`
    ).join('');
    return `<select class="order-status-select" data-order-id="${order.id}" aria-label="অর্ডার স্ট্যাটাস">${options}</select>`;
  }

  async function updateStatus(id, status) {
    await adminApi(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (typeof showToast === 'function') {
      showToast('অর্ডার স্ট্যাটাস আপডেট হয়েছে');
    }
    load();
  }

  async function verifyPayment(id) {
    await adminApi(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status: 'verified', status: 'confirmed' }),
    });
    load();
  }

  async function rejectPayment(id) {
    await adminApi(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status: 'rejected', status: 'cancelled' }),
    });
    load();
  }

  async function deleteOrder(id, orderNumber) {
    const label = orderNumber ? `অর্ডার ${orderNumber}` : 'এই অর্ডার';
    if (!confirm(`${label} স্থায়ীভাবে ডিলিট করবেন?\n\nএটি আর ফিরিয়ে আনা যাবে না।`)) return;
    await adminApi(`/orders/${id}`, { method: 'DELETE' });
    if (typeof showToast === 'function') {
      showToast('অর্ডার ডিলিট হয়েছে');
    }
    load();
  }

  async function sendToCourier(id) {
    if (!confirm('এই অর্ডারটি Steadfast কুরিয়ারে পাঠাবেন?')) return;
    const res = await adminApi(`/orders/${id}/courier`, { method: 'POST' });
    if (typeof showToast === 'function') {
      showToast(
        res.alreadySent
          ? 'এই অর্ডার আগেই কুরিয়ারে পাঠানো হয়েছে'
          : `কুরিয়ারে পাঠানো হয়েছে — ট্র্যাকিং ${res.trackingCode || ''}`
      );
    }
    load();
  }

  async function syncCourierStatus(id) {
    const res = await adminApi(`/orders/${id}/courier/sync`, { method: 'POST' });
    if (typeof showToast === 'function') {
      showToast(`কুরিয়ার স্ট্যাটাস: ${res.courierStatusLabel || res.courierStatus || '—'}`);
    }
    load();
  }

  function courierCell(o) {
    if (o.courierTrackingCode) {
      return `<div class="courier-cell">
        <span class="courier-code">${o.courierTrackingCode}</span>
        <span class="courier-status">${o.courierStatusLabel || '—'}</span>
        <button class="action-btn" data-courier-sync="${o.id}" title="কুরিয়ার স্ট্যাটাস রিফ্রেশ করুন">🔄</button>
      </div>`;
    }
    const errorNote = o.courierError
      ? `<span class="courier-error" title="${o.courierError}">⚠️ ${o.courierError}</span>`
      : '';
    return `<div class="courier-cell">
      <button class="action-btn" data-courier-send="${o.id}">🚚 পাঠান</button>
      ${errorNote}
    </div>`;
  }

  async function load() {
    const { orders } = await adminApi('/orders');
    const tbody = document.getElementById('ordersFullBody');
    if (!tbody) return;
    tbody.innerHTML = (orders || [])
      .map((o) => {
        const payActions =
          o.paymentStatus === 'submitted'
            ? `<button class="action-btn" data-verify="${o.id}">✅ Verify</button>
               <button class="action-btn" data-reject="${o.id}">❌</button>`
            : o.paymentMethod === 'cod'
              ? `<span class="muted-action">COD</span>`
              : '';
        const deleteBtn = `<button class="action-btn action-btn-danger" data-delete="${o.id}" data-order-number="${o.orderNumber || ''}" title="অর্ডার ডিলিট করুন">🗑️</button>`;
        return `
      <tr>
        <td><span class="order-id">${o.orderNumber || '-'}</span><br><small style="color:var(--muted)">${new Date(o.createdAt).toLocaleString('bn-BD')}</small></td>
        <td>${o.customer}<br><small>${o.phone || ''}</small>${o.address ? `<br><small style="color:var(--muted)">${o.address}</small>` : ''}</td>
        <td>${paymentLabel(o.paymentMethod)}<br>${paymentStatusBadge(o.paymentStatus)}</td>
        <td style="font-size:12px;">${o.transactionId || '-'}<br>${o.deliveryAreaLabel || ''}</td>
        <td>${statusSelect(o)}</td>
        <td>${courierCell(o)}</td>
        <td class="amount-cell">${formatBDT(o.total)}</td>
        <td class="order-actions">${payActions}${deleteBtn}</td>
      </tr>`;
      })
      .join('');
  }

  async function loadCourierBalance() {
    const box = document.getElementById('courierBalance');
    if (!box) return;
    try {
      const { balance } = await adminApi('/courier/balance');
      box.textContent = `🚚 Steadfast ব্যালেন্স: ${formatBDT(balance)}`;
      box.classList.toggle('courier-balance-low', Number(balance) < 500);
    } catch {
      box.textContent = '';
    }
  }

  function initOrdersPage() {
    window.verifyPayment = verifyPayment;
    window.rejectPayment = rejectPayment;
    const tbody = document.getElementById('ordersFullBody');
    if (!tbody) return;

    tbody.addEventListener('change', async (e) => {
      const select = e.target.closest('.order-status-select');
      if (!select) return;
      const id = select.getAttribute('data-order-id');
      const status = select.value;
      select.disabled = true;
      try {
        await updateStatus(id, status);
      } catch (err) {
        alert(err.message || 'স্ট্যাটাস আপডেট ব্যর্থ');
        load();
      }
    });

    tbody.addEventListener('click', async (e) => {
      const verifyBtn = e.target.closest('[data-verify]');
      const rejectBtn = e.target.closest('[data-reject]');
      const deleteBtn = e.target.closest('[data-delete]');
      const courierSendBtn = e.target.closest('[data-courier-send]');
      const courierSyncBtn = e.target.closest('[data-courier-sync]');
      try {
        if (verifyBtn) await verifyPayment(verifyBtn.getAttribute('data-verify'));
        if (rejectBtn) await rejectPayment(rejectBtn.getAttribute('data-reject'));
        if (courierSendBtn) await sendToCourier(courierSendBtn.getAttribute('data-courier-send'));
        if (courierSyncBtn) await syncCourierStatus(courierSyncBtn.getAttribute('data-courier-sync'));
        if (deleteBtn) {
          await deleteOrder(
            deleteBtn.getAttribute('data-delete'),
            deleteBtn.getAttribute('data-order-number')
          );
        }
      } catch (err) {
        alert(err.message || 'অ্যাকশন ব্যর্থ');
      }
    });

    loadCourierBalance();
    return load();
  }

  bootAdminPage('orders', initOrdersPage);
})();
