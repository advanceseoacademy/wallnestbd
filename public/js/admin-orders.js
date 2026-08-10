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
              : '-';
        return `
      <tr>
        <td><span class="order-id">${o.orderNumber || '-'}</span><br><small style="color:var(--muted)">${new Date(o.createdAt).toLocaleString('bn-BD')}</small></td>
        <td>${o.customer}<br><small>${o.phone || ''}</small>${o.address ? `<br><small style="color:var(--muted)">${o.address}</small>` : ''}</td>
        <td>${paymentLabel(o.paymentMethod)}<br>${paymentStatusBadge(o.paymentStatus)}</td>
        <td style="font-size:12px;">${o.transactionId || '-'}<br>${o.deliveryAreaLabel || ''}</td>
        <td>${statusSelect(o)}</td>
        <td class="amount-cell">${formatBDT(o.total)}</td>
        <td class="order-actions">${payActions}</td>
      </tr>`;
      })
      .join('');
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
      try {
        if (verifyBtn) await verifyPayment(verifyBtn.getAttribute('data-verify'));
        if (rejectBtn) await rejectPayment(rejectBtn.getAttribute('data-reject'));
      } catch (err) {
        alert(err.message || 'অ্যাকশন ব্যর্থ');
      }
    });

    return load();
  }

  bootAdminPage('orders', initOrdersPage);
})();
