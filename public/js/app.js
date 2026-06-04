const products = window.__PRODUCTS__ || [];
let activeCategory = 'all';
let paymentSettings = {};
let selectedPayment = null;

function formatBDT(n) {
  return `৳${Number(n || 0).toLocaleString('bn-BD', { maximumFractionDigits: 0 })}`;
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function badgeHtml(badge) {
  if (!badge) return '';
  const cls = badge === 'new' ? 'new' : badge === 'hot' ? 'hot' : '';
  const label = badge === 'sale' ? '🔥 SALE' : badge === 'new' ? '🆕 NEW' : '🌶️ HOT';
  return `<div class="product-badge ${cls}">${label}</div>`;
}

function productCardHtml(p) {
  const stars = '★'.repeat(Math.floor(p.rating)) + '☆'.repeat(5 - Math.floor(p.rating));
  return `
    <a href="/product/${p.id}" class="product-card" data-product-id="${p.id}">
      ${badgeHtml(p.badge)}
      <button type="button" class="product-fav" onclick="event.preventDefault(); event.stopPropagation(); toggleFav(this)">🤍</button>
      <div class="product-img">${p.imageUrl ? `<img src="${p.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;">` : p.icon}</div>
      <div class="product-body">
        <div class="product-cat">${p.cat}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-name-bn">${p.nameBn || ''}</div>
        <div class="product-rating">
          <span class="stars">${stars}</span>
          <span class="rating-count">${p.rating} (${(p.reviews || 0).toLocaleString()})</span>
        </div>
        <div class="product-price">
          <span class="price-current">${formatBDT(p.price)}</span>
          ${p.original > p.price ? `<span class="price-original">${formatBDT(p.original)}</span><span class="price-save">সেভ ${formatBDT(p.original - p.price)}</span>` : ''}
        </div>
        <div class="product-footer">
          <button type="button" class="btn-add-cart" onclick="event.preventDefault(); event.stopPropagation(); addToCart(${p.id})">🛒 কার্টে যোগ</button>
          <button type="button" class="btn-buy-now" onclick="event.preventDefault(); event.stopPropagation(); buyNow(${p.id})">Buy Now</button>
        </div>
      </div>
    </a>`;
}

function renderProducts(list, containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = list.map(productCardHtml).join('');
}

async function filterCategory(slug) {
  activeCategory = slug;
  document.querySelectorAll('.cat-chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.cat === slug);
  });
  try {
    const q = slug === 'all' ? '' : `?category=${encodeURIComponent(slug)}`;
    const { products: list } = await api(`/products${q}`);
    renderProducts(list, 'productGrid');
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    showToast(e.message, 'warning');
  }
}

document.querySelectorAll('.cat-chip').forEach((chip) => {
  chip.addEventListener('click', (e) => {
    e.preventDefault();
    filterCategory(chip.dataset.cat);
  });
});

document.querySelectorAll('[data-nav-cat]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    filterCategory(link.dataset.navCat);
  });
});

async function handleSearch() {
  const q = document.getElementById('searchInput').value.trim();
  try {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
    const { products: list } = await api(`/products?${params}`);
    renderProducts(list.length ? list : products, 'productGrid');
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    if (q && !list.length) showToast('কোনো পণ্য পাওয়া যায়নি।', 'warning');
  } catch (e) {
    showToast(e.message, 'warning');
  }
}

document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

async function addToCart(id) {
  try {
    const data = await api('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId: id, quantity: 1 }),
    });
    document.getElementById('cartCount').textContent = data.count;
    const p = products.find((x) => x.id === id) || { name: 'Product' };
    showToast(`✅ "${p.name}" কার্টে যোগ হয়েছে!`);
    await refreshCart();
  } catch (e) {
    showToast(e.message, 'warning');
  }
}

async function buyNow(id) {
  await addToCart(id);
  toggleCart();
}

async function refreshCart() {
  try {
    const { items, count, subtotal } = await api('/cart');
    document.getElementById('cartCount').textContent = count;
    renderCartItems(items, subtotal);
  } catch (e) {
    console.error(e);
  }
}

function renderCartItems(items, subtotal = 0) {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  if (!items.length) {
    container.innerHTML = `<div class="cart-empty"><div class="ce-icon">🛒</div><p>কার্ট খালি আছে</p><p style="font-size:13px;margin-top:4px;">Your cart is empty</p></div>`;
    footer.style.display = 'none';
    return;
  }
  footer.style.display = 'block';
  const shipping = subtotal >= 1500 ? 0 : 80;
  container.innerHTML = items
    .map(
      (item) => `
    <div class="cart-item">
      <div class="cart-item-img">${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : item.icon}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatBDT(item.price * item.qty)}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" type="button" onclick="changeQty('${item.cartItemId}', -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" type="button" onclick="changeQty('${item.cartItemId}', 1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" type="button" onclick="removeFromCart('${item.cartItemId}')">🗑️</button>
    </div>`
    )
    .join('');
  document.getElementById('cartSubtotal').textContent = formatBDT(subtotal);
  document.getElementById('cartShipping').textContent =
    shipping === 0 ? 'FREE' : formatBDT(shipping);
  document.getElementById('cartTotal').textContent = formatBDT(subtotal + shipping);
}

async function loadPaymentMethods() {
  try {
    const { payments } = await api('/payments');
    paymentSettings = payments || {};
  } catch (e) {
    console.error(e);
  }
}

function renderPaymentOptions() {
  const box = document.getElementById('paymentMethods');
  if (!box) return;
  const methods = [
    { key: 'bkash', label: 'bKash', color: '#E2136E' },
    { key: 'rocket', label: 'Rocket', color: '#8B2D9E' },
    { key: 'nagad', label: 'Nagad', color: '#F6921E' },
  ];
  box.innerHTML = methods
    .filter((m) => paymentSettings[m.key]?.enabled !== false)
    .map(
      (m) => `
    <label style="display:flex;align-items:center;gap:10px;padding:12px;border:2px solid var(--border);border-radius:8px;cursor:pointer;">
      <input type="radio" name="payMethod" value="${m.key}" onchange="selectPayment('${m.key}')">
      <strong style="color:${m.color}">${m.label}</strong>
      <span style="font-size:12px;color:var(--text-muted);">${paymentSettings[m.key]?.number || ''}</span>
    </label>`
    )
    .join('');
}

function selectPayment(key) {
  selectedPayment = key;
  const p = paymentSettings[key];
  const el = document.getElementById('paymentDetails');
  if (!el || !p) return;
  el.style.display = 'block';
  el.innerHTML = `
    <strong>${p.label || key}</strong> — ${p.account_type || 'Personal'}<br>
    নম্বর: <strong style="font-size:16px;color:var(--primary);">${p.number || 'অ্যাডমিনে সেট করুন'}</strong><br>
    <span style="color:var(--text-muted);">${p.instructions || ''}</span>
  `;
}

async function openCheckout() {
  await loadPaymentMethods();
  selectedPayment = null;
  document.getElementById('paymentDetails').style.display = 'none';
  renderPaymentOptions();
  openModal('checkoutModal');
}

async function changeQty(cartItemId, delta) {
  try {
    const data = await api(`/cart/${cartItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ delta }),
    });
    renderCartItems(data.items, data.subtotal);
    document.getElementById('cartCount').textContent = data.count;
  } catch (e) {
    showToast(e.message, 'warning');
  }
}

async function removeFromCart(cartItemId) {
  try {
    const data = await api(`/cart/${cartItemId}`, { method: 'DELETE' });
    renderCartItems(data.items, 0);
    document.getElementById('cartCount').textContent = data.count;
  } catch (e) {
    showToast(e.message, 'warning');
  }
}

function toggleCart() {
  document.getElementById('cartOverlay').classList.toggle('open');
  if (document.getElementById('cartOverlay').classList.contains('open')) refreshCart();
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('open');
  });
});

const WISH_KEY = 'wn_wishlist';

function getWishlist() {
  try {
    return JSON.parse(localStorage.getItem(WISH_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

function saveWishlist(list) {
  localStorage.setItem(WISH_KEY, JSON.stringify(list.slice(0, 24)));
}

function toggleFav(btn) {
  const card = btn.closest('[data-product-id]');
  const id = card?.dataset?.productId;
  if (!id) {
    btn.textContent = btn.textContent === '🤍' ? '❤️' : '🤍';
    return;
  }
  let list = getWishlist();
  const idx = list.findIndex((x) => String(x.id) === String(id));
  if (idx >= 0) {
    list.splice(idx, 1);
    btn.textContent = '🤍';
    showToast('উইশলিস্ট থেকে সরানো হয়েছে');
  } else {
    const p = products.find((x) => String(x.id) === String(id));
    list.unshift({
      id,
      name: p?.nameBn || p?.name,
      icon: p?.icon,
      imageUrl: p?.imageUrl,
      price: p?.price,
      original: p?.original,
    });
    btn.textContent = '❤️';
    showToast('উইশলিস্টে যোগ হয়েছে ❤️');
  }
  saveWishlist(list);
}

document.querySelectorAll('.product-fav').forEach((btn) => {
  const card = btn.closest('[data-product-id]');
  const id = card?.dataset?.productId;
  if (id && getWishlist().some((x) => String(x.id) === String(id))) btn.textContent = '❤️';
});

async function placeOrder(e) {
  e.preventDefault();
  if (!selectedPayment) {
    showToast('পেমেন্ট পদ্ধতি বেছে নিন', 'warning');
    return;
  }
  try {
    const data = await api('/orders', {
      method: 'POST',
      body: JSON.stringify({
        shipping_name: document.getElementById('shipName').value,
        shipping_phone: document.getElementById('shipPhone').value,
        customer_email: document.getElementById('checkoutEmail')?.value?.trim() || undefined,
        shipping_address: document.getElementById('shipAddress').value,
        shipping_city: document.getElementById('shipCity').value,
        shipping_zip: document.getElementById('shipZip').value,
        payment_method: selectedPayment,
        payment_phone: document.getElementById('paymentPhone').value,
        transaction_id: document.getElementById('transactionId').value,
        customer_note: document.getElementById('customerNote').value,
      }),
    });
    closeModal('checkoutModal');
    await refreshCart();
    showToast(`🎉 অর্ডার জমা হয়েছে! ${data.orderNumber} — পেমেন্ট যাচাই হচ্ছে`);
  } catch (err) {
    showToast(err.message, 'warning');
  }
}

async function subscribeNewsletter(e) {
  e.preventDefault();
  const email = document.getElementById('newsletterEmail').value;
  try {
    await api('/newsletter', { method: 'POST', body: JSON.stringify({ email }) });
    showToast('সাবস্ক্রাইব সফল! 🎉');
    e.target.reset();
  } catch (err) {
    showToast(err.message, 'warning');
  }
}

async function login(e) {
  e.preventDefault();
  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value,
      }),
    });
    closeModal('loginModal');
    if (res.linkedOrders > 0) {
      showToast(`${res.linkedOrders}টি গেস্ট অর্ডার আপনার অ্যাকাউন্টে যুক্ত হয়েছে! 📦`);
    } else {
      showToast('সফলভাবে লগইন হয়েছে! ✅');
    }
    const next = new URLSearchParams(location.search).get('next') || '/account';
    setTimeout(() => { window.location.href = next; }, 600);
  } catch (err) {
    showToast(err.message, 'warning');
  }
}

async function register(e) {
  e.preventDefault();
  try {
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        firstName: document.getElementById('regFirst').value,
        lastName: document.getElementById('regLast').value,
      }),
    });
    closeModal('registerModal');
    showToast('অ্যাকাউন্ট তৈরি হয়েছে! ইমেইল চেক করুন। 🎉');
  } catch (err) {
    showToast(err.message, 'warning');
  }
}

async function logout() {
  await api('/auth/logout', { method: 'POST' });
  location.reload();
}

function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeftColor = type === 'warning' ? '#F59E0B' : 'var(--success)';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function updateCountdown() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const diff = Math.max(0, Math.floor((end - now) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const hours = document.getElementById('hours');
  if (hours) {
    hours.textContent = pad(h);
    document.getElementById('minutes').textContent = pad(m);
    document.getElementById('seconds').textContent = pad(s);
  }
}
setInterval(updateCountdown, 1000);
updateCountdown();

refreshCart();
loadPaymentMethods();

if (new URLSearchParams(location.search).get('login') === '1') {
  openModal('loginModal');
}
