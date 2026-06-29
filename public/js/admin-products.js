(function () {
  let productsCache = [];

  async function loadProducts() {
    const tbody = document.getElementById('productsBody');
    if (!tbody) return;

    tbody.innerHTML =
      '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted2);">লোড হচ্ছে…</td></tr>';

    try {
      const { products } = await adminApi('/products');
      productsCache = products || [];
      if (!productsCache.length) {
        tbody.innerHTML =
          '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted2);">কোনো পণ্য নেই — <a href="/admin/products/new" style="color:var(--primary);font-weight:600;">+ নতুন পণ্য</a> যোগ করুন।</td></tr>';
        return;
      }
      tbody.innerHTML = productsCache
        .map(
          (p) => `
    <tr>
      <td>${p.imageUrl ? `<img src="${p.imageUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">` : p.icon}</td>
      <td><strong>${p.name}</strong><br><small>${p.nameBn || ''}</small></td>
      <td><span class="cat-pill">${p.cat || '—'}</span></td>
      <td>${formatBDT(p.price)}</td>
      <td>${p.stock}</td>
      <td>${p.featured ? '✅' : ''} ${p.flash ? '⚡' : ''}</td>
      <td>
        <a class="action-btn" href="/admin/products/edit?id=${encodeURIComponent(p.id)}">এডিট</a>
        <button class="action-btn" type="button" onclick="deleteProduct('${p.id}')">ডিলিট</button>
      </td>
    </tr>`
        )
        .join('');
    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:#dc2626;">${err.message || 'পণ্য লোড ব্যর্থ'}</td></tr>`;
    }
  }

  async function deleteProduct(id) {
    if (!confirm('পণ্য ডিলিট করবেন?')) return;
    try {
      await adminApi(`/products/${id}`, { method: 'DELETE' });
      if (typeof clearAdminShellCache === 'function') clearAdminShellCache();
      await loadProducts();
    } catch (err) {
      alert(err.message || 'ডিলিট ব্যর্থ');
    }
  }

  function initProductsPage() {
    if (!document.getElementById('productsBody')) return;
    window.deleteProduct = deleteProduct;
    return loadProducts();
  }

  bootAdminPage('products', initProductsPage);
})();
