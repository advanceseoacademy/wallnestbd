(function () {
  const p = window.__PRODUCT_PAGE__;
  if (!p) return;

  const maxQty = parseInt(document.getElementById('productQty')?.max, 10) || 99;

  window.changeProductQty = function (delta) {
    const input = document.getElementById('productQty');
    if (!input) return;
    const next = Math.min(maxQty, Math.max(1, parseInt(input.value, 10) + delta));
    input.value = next;
  };

  window.getProductQty = function () {
    return parseInt(document.getElementById('productQty')?.value, 10) || 1;
  };

  window.addToCartWithQty = async function (id) {
    const qty = getProductQty();
    try {
      const data = await api('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId: id, quantity: qty }),
      });
      document.getElementById('cartCount').textContent = data.count;
      showToast(`✅ ${qty} পিস কার্টে যোগ হয়েছে!`);
      await refreshCart();
    } catch (e) {
      showToast(e.message, 'warning');
    }
  };

  window.buyNowWithQty = async function (id) {
    await addToCartWithQty(id);
    toggleCart();
  };

  window.shareWhatsApp = function () {
    const url = window.location.href;
    const text = encodeURIComponent(`${p.name} — ৳${p.price} | WallNest BD\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  window.copyProductLink = function () {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('লিংক কপি হয়েছে!');
    });
  };

  document.querySelectorAll('.product-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.product-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.product-tab-panel').forEach((panel) => panel.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  });

  function saveRecent() {
    const key = 'wn_recent';
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (_) {}
    list = list.filter((x) => x.id !== p.id);
    list.unshift({
      id: p.id,
      name: p.name,
      icon: p.icon,
      imageUrl: p.imageUrl,
      price: p.price,
      cat: p.catSlug,
    });
    list = list.slice(0, 6);
    localStorage.setItem(key, JSON.stringify(list));
    renderRecent(list.filter((x) => x.id !== p.id));
  }

  function renderRecent(list) {
    const section = document.getElementById('recentSection');
    const grid = document.getElementById('recentGrid');
    if (!section || !grid || !list.length) return;
    section.style.display = 'block';
    grid.innerHTML = list
      .slice(0, 4)
      .map(
        (item) => `
      <a href="/product/${item.id}" class="product-card">
        <div class="product-img">${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;height:100%;object-fit:cover">` : item.icon}</div>
        <div class="product-body">
          <div class="product-name">${item.name}</div>
          <div class="product-price"><span class="price-current">৳${Number(item.price).toLocaleString('bn-BD')}</span></div>
        </div>
      </a>`
      )
      .join('');
  }

  saveRecent();
})();
