function renderChart(chart) {
  const container = document.getElementById('chartArea');
  if (!container) return;
  [...container.querySelectorAll('.chart-bar-wrap')].forEach((el) => el.remove());
  const max = Math.max(...chart.map((c) => c.value), 1);
  chart.forEach((item, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'chart-bar-wrap';
    wrap.style.height = '100%';
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.background = 'linear-gradient(180deg, var(--primary), rgba(0,163,224,0.45))';
    bar.style.width = '100%';
    const tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.textContent = formatBDT(item.value);
    bar.appendChild(tip);
    const label = document.createElement('div');
    label.className = 'chart-label';
    label.textContent = item.label;
    wrap.appendChild(bar);
    wrap.appendChild(label);
    container.appendChild(wrap);
    setTimeout(() => {
      bar.style.height = `${(item.value / max) * 145}px`;
    }, 80 + i * 50);
  });
}

function renderTopProducts(list) {
  const el = document.getElementById('topProductsList');
  if (!el) return;
  if (!list.length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:13px;">এখনো বিক্রয় ডাটা নেই</p>';
    return;
  }
  const colors = ['b', 'g', 'a', 'p', 'b'];
  el.innerHTML = list
    .map(
      (p, i) => `
    <div class="top-product-item">
      <div class="tp-rank ${i === 0 ? 'gold' : ''}">${p.rank}</div>
      <div class="tp-thumb">${p.icon}</div>
      <div class="tp-info"><div class="tp-name">${p.name}</div><div class="tp-cat">${p.qty} sold</div></div>
      <div class="tp-bar-wrap"><div class="tp-bar-bg"><div class="tp-bar ${colors[i]}" style="width:${p.pct}%"></div></div></div>
      <div class="tp-sales">${p.sales}</div>
    </div>`
    )
    .join('');
}

async function init() {
  const data = await adminApi('/stats');
  document.getElementById('statRevenue').textContent = formatBDT(data.revenue);
  document.getElementById('statOrders').textContent = formatStatNum(data.orderCount);
  document.getElementById('statToday').textContent = `আজ: ${formatStatNum(data.todayOrders)}`;
  document.getElementById('statProducts').textContent = formatStatNum(data.productCount);
  document.getElementById('statPending').textContent = formatStatNum(data.pendingPayments);

  renderChart(data.chart);
  renderTopProducts(data.topProducts);

  const orders = await adminApi('/orders');
  const tbody = document.getElementById('ordersTableBody');
  tbody.innerHTML = (orders.orders || [])
    .slice(0, 6)
    .map(
      (o) => `
    <tr>
      <td><span class="order-id">${o.orderNumber || o.id.slice(0, 8)}</span></td>
      <td>${o.customer}</td>
      <td>${paymentLabel(o.paymentMethod)}</td>
      <td>${paymentStatusBadge(o.paymentStatus)}</td>
      <td class="amount-cell">${formatBDT(o.total)}</td>
    </tr>`
    )
    .join('');

  renderCatalogCategories(data.categories || []);
}

const CATALOG_COLORS = ['#0071CE', '#FFC220', '#10B981', '#004F93', '#00A3E0'];

function renderCatalogCategories(list) {
  const catEl = document.getElementById('categoryLegend');
  if (!catEl) return;
  if (!list.length) {
    catEl.innerHTML =
      '<p style="color:var(--muted);font-size:13px;">ক্যাটাগরি লোড হয়নি। <code>npm run seed</code> চালান।</p>';
    return;
  }
  catEl.innerHTML = `
    <p class="admin-catalog-note">টার্গেট ক্যাটালগ মিক্স — মোট ১০০%</p>
    ${list
      .map(
        (c, i) => `
      <div class="admin-cat-row">
        <div class="admin-cat-head">
          <span class="admin-cat-name">${c.icon || '🖼️'} ${c.name}</span>
          <span class="admin-cat-meta">টার্গেট <strong>${c.pct}%</strong> · ${c.productCount} পণ্য</span>
        </div>
        ${c.nameBn ? `<div class="admin-cat-bn">${c.nameBn}</div>` : ''}
        <div class="admin-cat-bar">
          <div class="admin-cat-fill" style="width:${c.pct}%;background:${CATALOG_COLORS[i % CATALOG_COLORS.length]}"></div>
        </div>
      </div>`
      )
      .join('')}
  `;
}

init().catch(console.error);
