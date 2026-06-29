(function () {
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
        return `
      <tr>
        <td><span class="order-id">${o.orderNumber || '-'}</span><br><small style="color:var(--muted)">${new Date(o.createdAt).toLocaleString('bn-BD')}</small></td>
        <td>${o.customer}<br><small>${o.phone || ''}</small></td>
        <td>${paymentLabel(o.paymentMethod)}<br>${paymentStatusBadge(o.paymentStatus)}</td>
        <td style="font-size:12px;">${o.transactionId || '-'}<br>${o.phone || ''}</td>
        <td><span class="status-badge processing">${o.status}</span></td>
        <td class="amount-cell">${formatBDT(o.total)}</td>
        <td>
          ${o.paymentStatus === 'submitted' ? `<button class="action-btn" onclick="verifyPayment('${o.id}')">✅ Verify</button> <button class="action-btn" onclick="rejectPayment('${o.id}')">❌</button>` : '-'}
        </td>
      </tr>`;
      })
      .join('');
  }

  function initOrdersPage() {
    window.verifyPayment = verifyPayment;
    window.rejectPayment = rejectPayment;
    if (!document.getElementById('ordersFullBody')) return;
    return load();
  }

  bootAdminPage('orders', initOrdersPage);
})();
