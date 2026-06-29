(function redirectOAuthCodeToCallback() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '/';
  if (path === '/auth/callback') return;
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const oauthError = params.get('error') || params.get('error_description');
  if (!code && !oauthError) return;
  const qs = new URLSearchParams();
  if (code) qs.set('code', code);
  if (params.get('error')) qs.set('error', params.get('error'));
  if (params.get('error_description')) qs.set('error_description', params.get('error_description'));
  qs.set('next', params.get('next') || '/account');
  window.location.replace(`/auth/callback?${qs.toString()}`);
})();

const products = window.__PRODUCTS__ || [];
let activeCategory = 'all';
let paymentSettings = {};
let selectedPayment = null;
let checkoutTotal = 0;

function getStoreShippingConfig() {
  const cfg = window.__WN_STORE__ || {};
  return {
    freeShippingMin: Number(cfg.freeShippingMin) || 1500,
    shippingFee: Number(cfg.shippingFee) || 80,
  };
}

function calcShipping(subtotal) {
  const { freeShippingMin, shippingFee } = getStoreShippingConfig();
  return Number(subtotal) >= freeShippingMin ? 0 : shippingFee;
}

function formatBDT(n) {
  return `৳${Number(n || 0).toLocaleString('bn-BD', { maximumFractionDigits: 0 })}`;
}

const PRODUCT_TITLE_MAX = 30;

function truncateTitle(text, max = PRODUCT_TITLE_MAX) {
  const s = String(text || '').trim();
  if (!s) return '';
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}...`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.needsVerification = Boolean(data.needsVerification);
    throw err;
  }
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
    <a href="/product/${p.slug || p.id}" class="product-card" data-product-id="${p.id}">
      ${badgeHtml(p.badge)}
      <button type="button" class="product-fav" onclick="event.preventDefault(); event.stopPropagation(); toggleFav(this)">🤍</button>
      <div class="product-img">${p.imageUrl ? `<img src="${p.imageUrl}" alt="${(p.name || '').replace(/"/g, '&quot;')}">` : p.icon}</div>
      <div class="product-body">
        <div class="product-cat">${p.cat}</div>
        <div class="product-name" title="${escapeHtml(p.name)}">${escapeHtml(p.nameDisplay || truncateTitle(p.name))}</div>
        ${p.nameBn || p.nameBnDisplay ? `<div class="product-name-bn" title="${escapeHtml(p.nameBn)}">${escapeHtml(p.nameBnDisplay || truncateTitle(p.nameBn))}</div>` : ''}
        <div class="product-rating">
          <span class="stars">${stars}</span>
          <span class="rating-count">${p.rating} (${(p.reviews || 0).toLocaleString()})</span>
        </div>
        <div class="product-price">
          ${p.fromPrice ? '<span class="price-from">শুরু </span>' : ''}<span class="price-current">${formatBDT(p.price)}</span>
          ${p.original > p.price ? `<span class="price-original">${formatBDT(p.original)}</span><span class="price-save">সেভ ${formatBDT(p.original - p.price)}</span>` : ''}
        </div>
        <div class="product-footer">
          <button type="button" class="btn-add-cart" onclick="event.preventDefault(); event.stopPropagation(); addToCart(${JSON.stringify(p.id)})">🛒 কার্টে যোগ</button>
          <button type="button" class="btn-buy-now" onclick="event.preventDefault(); event.stopPropagation(); buyNow(${JSON.stringify(p.id)})">Buy Now</button>
        </div>
      </div>
    </a>`;
}

const HOME_CATEGORY_SLUGS = [
  'islamic-wall-art',
  'family-photo-canvas',
  'kids-room-art',
  'office-motivational-art',
];

function carouselTrackItems(list) {
  if (!list.length) return [];
  if (list.length < 2) return list;
  return list.concat(list);
}

function renderCategoryTrack(slug, list) {
  const track = document.getElementById(`track-${slug}`);
  if (!track) return;
  const items = carouselTrackItems(list);
  track.innerHTML = items.map(productCardHtml).join('');
  track.style.transform = '';
}

function renderAllCategorySections(list) {
  HOME_CATEGORY_SLUGS.forEach((slug) => {
    renderCategoryTrack(
      slug,
      list.filter((p) => p.catSlug === slug)
    );
  });
  initStoreCarousels();
}

function filterCategory(slug) {
  if (!slug) return;
  activeCategory = slug;
  document.querySelectorAll('.cat-chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.cat === slug);
  });
  if (slug === 'all') {
    document.getElementById('category-sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const section = document.getElementById(`category-${slug}`);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function syncCategoryUrl(slug) {
  if (typeof window === 'undefined') return;
  const path = slug === 'all' ? '/' : `/category/${encodeURIComponent(slug)}`;
  const current = window.location.pathname + window.location.search;
  if (current !== path && (window.location.pathname === '/' || window.location.pathname === '')) {
    window.history.replaceState(null, '', path);
  }
}

function getCategorySlugFromUrl() {
  const pathMatch = window.location.pathname.match(/^\/category\/([^/]+)/);
  if (pathMatch) return decodeURIComponent(pathMatch[1]);
  return new URLSearchParams(window.location.search).get('category');
}

function setActiveCategoryChip(slug) {
  activeCategory = slug || 'all';
  document.querySelectorAll('.cat-chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.cat === activeCategory);
  });
}

function applyCategoryFromUrl() {
  const urlCat = getCategorySlugFromUrl();
  if (urlCat && urlCat !== 'all') {
    filterCategory(urlCat);
    return;
  }
  // Homepage load: highlight "all" without auto-scrolling past the hero
  if (document.querySelector('.cat-chip[data-cat="all"]')) {
    setActiveCategoryChip('all');
  }
}

function mountMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  if (menu && menu.parentElement !== document.body) {
    document.body.appendChild(menu);
  }
}

function renderMobileMenuCategories(categories, activeNav) {
  const el = document.getElementById('mobileMenuCategories');
  if (!el) return;
  const list = (categories || [])
    .filter((c) => c.slug && c.slug !== 'all')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  if (!list.length) return;
  const activeCat = activeNav || getCategorySlugFromUrl() || '';
  el.innerHTML = list
    .map((c) => {
      const active = activeCat === c.slug ? ' is-active' : '';
      const label = `${c.icon || '🖼️'} ${c.name_bn || c.name_en || c.slug}`;
      return `<a href="/category/${encodeURIComponent(c.slug)}" class="mobile-menu-item${active}" data-cat="${c.slug}"><span class="mobile-menu-item-label">${label}</span></a>`;
    })
    .join('');
}

async function hydrateMobileMenuCategories(force = false) {
  const el = document.getElementById('mobileMenuCategories');
  if (!el) return;
  if (!force && el.querySelector('.mobile-menu-item')) return;
  try {
    const { categories } = await api('/categories');
    renderMobileMenuCategories(categories);
  } catch {
    if (!el.querySelector('.mobile-menu-item')) {
      el.innerHTML = '<p class="mobile-menu-empty">ক্যাটাগরি লোড হয়নি</p>';
    }
  }
}

function closeNavMenu() {
  const menu = document.getElementById('mobileMenu');
  const toggle = document.getElementById('navMenuToggle');
  document.body.classList.remove('mobile-menu-open');
  if (menu) {
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
  }
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

async function openNavMenu() {
  const menu = document.getElementById('mobileMenu');
  const toggle = document.getElementById('navMenuToggle');
  if (!menu) return;
  await hydrateMobileMenuCategories(true);
  menu.classList.add('is-open');
  menu.setAttribute('aria-hidden', 'false');
  document.body.classList.add('mobile-menu-open');
  if (toggle) toggle.setAttribute('aria-expanded', 'true');
}

function bindNavMenu() {
  if (window.__wnNavMenuBound) return;
  if (!document.getElementById('navMenuToggle')) return;
  window.__wnNavMenuBound = true;

  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('#navMenuToggle');
    if (toggle) {
      e.preventDefault();
      e.stopPropagation();
      const menu = document.getElementById('mobileMenu');
      if (menu?.classList.contains('is-open')) closeNavMenu();
      else openNavMenu();
      return;
    }
    if (e.target.closest('#navMenuClose') || e.target.closest('#mobileMenuOverlay')) {
      e.preventDefault();
      closeNavMenu();
      return;
    }
    const item = e.target.closest('.mobile-menu-item');
    if (item) {
      closeNavMenu();
      if (item.dataset?.cat) {
        const onHome = window.location.pathname === '/' || window.location.pathname === '';
        if (onHome) {
          e.preventDefault();
          filterCategory(item.dataset.cat);
          syncCategoryUrl(item.dataset.cat);
        }
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNavMenu();
  });
}

function bindCategoryNavigation() {
  if (window.__wnCatNavBound) return;
  window.__wnCatNavBound = true;

  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.cat-chip');
    if (chip?.dataset?.cat) {
      e.preventDefault();
      const slug = chip.dataset.cat;
      filterCategory(slug);
      syncCategoryUrl(slug);
      return;
    }
    const navLink = e.target.closest('.nav-desktop .nav-link[data-cat]');
    if (navLink?.dataset?.cat) {
      const onHome = window.location.pathname === '/' || window.location.pathname === '';
      if (onHome) {
        e.preventDefault();
        filterCategory(navLink.dataset.cat);
        syncCategoryUrl(navLink.dataset.cat);
      }
    }
  });
}

function refreshReviewSeeMore() {
  document.querySelectorAll('.review-card').forEach((card) => {
    const text = card.querySelector('.review-text');
    const moreBtn = card.querySelector('.review-see-more');
    const lessBtn = card.querySelector('.review-see-less');
    if (!text || !moreBtn) return;
    if (card.classList.contains('is-expanded')) return;

    text.classList.add('is-clamped');
    moreBtn.hidden = true;
    if (lessBtn) lessBtn.hidden = true;

    requestAnimationFrame(() => {
      if (text.scrollHeight > text.clientHeight + 2) {
        moreBtn.hidden = false;
      }
    });
  });
}

function bindReviewSeeMore() {
  if (window.__wnReviewSeeMoreBound) return;
  window.__wnReviewSeeMoreBound = true;

  document.addEventListener('click', (e) => {
    const more = e.target.closest('.review-see-more');
    if (more) {
      e.preventDefault();
      e.stopPropagation();
      const card = more.closest('.review-card');
      const text = card?.querySelector('.review-text');
      const less = card?.querySelector('.review-see-less');
      if (!card || !text) return;
      card.classList.add('is-expanded');
      text.classList.remove('is-clamped');
      more.hidden = true;
      if (less) less.hidden = false;
      const block = document.getElementById('reviewsCarousel');
      if (block?._carouselState) block._carouselState.paused = true;
      return;
    }
    const less = e.target.closest('.review-see-less');
    if (less) {
      e.preventDefault();
      e.stopPropagation();
      const card = less.closest('.review-card');
      const text = card?.querySelector('.review-text');
      if (!card || !text) return;
      card.classList.remove('is-expanded');
      text.classList.add('is-clamped');
      less.hidden = true;
      refreshReviewSeeMore();
      const block = document.getElementById('reviewsCarousel');
      if (block?._carouselState) block._carouselState.paused = false;
    }
  });

  window.addEventListener('resize', () => {
    requestAnimationFrame(refreshReviewSeeMore);
  });
}

function bootHomePage() {
  bindNavMenu();
  bindCategoryNavigation();
  applyCategoryFromUrl();
  initStoreCarousels();
  refreshReviewSeeMore();
}

mountMobileMenu();
hydrateMobileMenuCategories();
bindNavMenu();
bindCategoryNavigation();
bindReviewSeeMore();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', refreshReviewSeeMore);
} else {
  refreshReviewSeeMore();
}

async function handleSearch() {
  const q = document.getElementById('searchInput').value.trim();
  try {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (activeCategory && activeCategory !== 'all') params.set('category', activeCategory);
    const { products: list } = await api(`/products?${params}`);
    renderAllCategorySections(list.length ? list : products);
    document.getElementById('category-sections')?.scrollIntoView({ behavior: 'smooth' });
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

function cartLineSubtotal(items, subtotal) {
  const computed = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return typeof subtotal === 'number' ? subtotal : computed;
}

function renderCartItems(items, subtotal) {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const headerCount = document.getElementById('cartHeaderCount');
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  if (!items.length) {
    container.innerHTML = `<div class="cart-empty"><div class="ce-icon">🛒</div><p>কার্ট খালি আছে</p><p class="cart-empty-sub">পছন্দের পণ্য কার্টে যোগ করুন</p></div>`;
    footer.style.display = 'none';
    if (headerCount) headerCount.textContent = '';
    return;
  }
  footer.style.display = 'block';
  const lineSubtotal = cartLineSubtotal(items, subtotal);
  const shipping = calcShipping(lineSubtotal);
  checkoutTotal = lineSubtotal + shipping;
  if (headerCount) {
    headerCount.textContent = `${itemCount} আইটেম`;
  }
  container.innerHTML = items
    .map(
      (item) => `
    <div class="cart-item">
      <div class="cart-item-img">${item.imageUrl ? `<img src="${item.imageUrl}" alt="">` : item.icon}</div>
      <div class="cart-item-body">
        <div class="cart-item-top">
          <div class="cart-item-name" title="${escapeHtml(item.displayName || item.name)}">${escapeHtml(truncateTitle(item.displayName || item.name))}</div>
          <button class="cart-item-remove" type="button" aria-label="সরান" onclick="removeFromCart('${item.cartItemId}')">✕</button>
        </div>
        <div class="cart-item-meta">
          <span class="cart-item-unit">${formatBDT(item.price)} × ${item.qty}</span>
          <span class="cart-item-price">${formatBDT(item.price * item.qty)}</span>
        </div>
        <div class="cart-item-qty">
          <button class="qty-btn" type="button" aria-label="কমান" onclick="changeQty('${item.cartItemId}', -1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" type="button" aria-label="বাড়ান" onclick="changeQty('${item.cartItemId}', 1)">+</button>
        </div>
      </div>
    </div>`
    )
    .join('');
  document.getElementById('cartSubtotal').textContent = formatBDT(lineSubtotal);
  const shippingEl = document.getElementById('cartShipping');
  shippingEl.textContent = shipping === 0 ? 'ফ্রি' : formatBDT(shipping);
  shippingEl.classList.toggle('is-free', shipping === 0);
  document.getElementById('cartTotal').textContent = formatBDT(checkoutTotal);
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
  const amount = checkoutTotal > 0 ? checkoutTotal : 0;
  el.style.display = 'block';
  el.innerHTML = `
    <strong>${p.label || key}</strong> — ${p.account_type || 'Personal'}<br>
    নম্বর: <strong style="font-size:16px;color:var(--primary);">${p.number || 'অ্যাডমিনে সেট করুন'}</strong>
    <div style="margin:10px 0 8px;padding:12px;background:#fff;border-radius:8px;border:1px solid rgba(0,113,206,.18);">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">Send Money করুন (ঠিক এই পরিমাণ)</div>
      <strong style="font-size:22px;color:var(--primary);letter-spacing:.02em;">${formatBDT(amount)}</strong>
    </div>
    <span style="color:var(--text-muted);">${p.instructions || 'উপরের নম্বরে ঠিক এই টাকা পাঠান, তারপর Transaction ID দিন।'}</span>
  `;
}

async function openCheckout() {
  await refreshCart();
  await loadPaymentMethods();
  selectedPayment = null;
  document.getElementById('paymentDetails').style.display = 'none';
  renderPaymentOptions();

  const emailGroup = document.getElementById('checkoutEmailGroup');
  const emailInput = document.getElementById('checkoutEmail');
  try {
    const nav = await fetch('/api/nav-context', { credentials: 'same-origin' }).then((r) =>
      r.ok ? r.json() : {}
    );
    if (nav.user?.email) {
      if (emailGroup) emailGroup.style.display = 'none';
      if (emailInput) {
        emailInput.required = false;
        emailInput.value = '';
      }
    } else {
      if (emailGroup) emailGroup.style.display = '';
      if (emailInput) emailInput.required = true;
    }
  } catch {
    if (emailGroup) emailGroup.style.display = '';
    if (emailInput) emailInput.required = true;
  }

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
    renderCartItems(data.items, data.subtotal);
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
    showToast(`🎉 অর্ডার ${data.orderNumber} জমা হয়েছে! পেমেন্ট যাচাই হচ্ছে`);
    setTimeout(() => {
      window.location.href = `/track-order?order=${encodeURIComponent(data.orderNumber)}`;
    }, 1200);
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

let supabaseBrowserClient = null;

function getSupabaseCreateClient() {
  const lib = window.supabase;
  if (!lib?.createClient) {
    throw new Error('Google sign-in লাইব্রেরি লোড হয়নি। পেজ রিফ্রেশ করুন।');
  }
  return lib.createClient;
}

function supabaseAuthStorageKey(url) {
  const ref = String(url || '').match(/https?:\/\/([^.]+)\.supabase\.co/i)?.[1];
  return ref ? `sb-${ref}-auth-token` : 'sb-auth-token';
}

function getSupabaseBrowser() {
  if (!window.__WN_SB__?.url || !window.__WN_SB__?.key) {
    throw new Error('Google sign-in is not configured yet.');
  }
  if (supabaseBrowserClient) return supabaseBrowserClient;
  const createClient = getSupabaseCreateClient();
  const sbUrl = window.__WN_SB__.url;
  supabaseBrowserClient = createClient(sbUrl, window.__WN_SB__.key, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: supabaseAuthStorageKey(sbUrl),
    },
  });
  return supabaseBrowserClient;
}

async function signInWithGoogle(e) {
  if (e?.preventDefault) e.preventDefault();
  try {
    const sb = getSupabaseBrowser();
    const next =
      new URLSearchParams(location.search).get('next') ||
      (location.pathname.startsWith('/account') ? '/account' : '/account');
    const redirectTo = `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('Google redirect URL পাওয়া যায়নি');
    closeModal('loginModal');
    closeModal('registerModal');
    window.location.href = data.url;
  } catch (err) {
    showToast(err.message || 'Google লগইন ব্যর্থ', 'warning');
  }
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    closeModal('loginModal');
    clearPageCaches();
    patchHeaderAuth(res.user);
    if (res.linkedOrders > 0) {
      showToast(`${res.linkedOrders}টি গেস্ট অর্ডার আপনার অ্যাকাউন্টে যুক্ত হয়েছে! 📦`);
    } else {
      showToast('সফলভাবে লগইন হয়েছে! ✅');
    }
    const next = new URLSearchParams(location.search).get('next') || '/account';
    setTimeout(() => { window.location.href = next; }, 600);
  } catch (err) {
    if (err.needsVerification) {
      const resend = confirm(
        `${err.message}\n\nআবার যাচাই লিংক পাঠাতে চান?`
      );
      if (resend) {
        try {
          await api('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          showToast('নতুন যাচাই লিংক ইমেইলে পাঠানো হয়েছে 📧');
        } catch (resendErr) {
          showToast(resendErr.message, 'warning');
        }
      }
      return;
    }
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
    showToast('অ্যাকাউন্ট তৈরি হয়েছে! ইমেইলে যাচাই লিংক পাঠানো হয়েছে 📧');
  } catch (err) {
    showToast(err.message, 'warning');
  }
}

const USER_ICON_SVG =
  '<svg class="header-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

function clearPageCaches() {
  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('wn_page_') || key.startsWith('wn_account_')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch {
    /* ignore */
  }
}

function patchHeaderAuth(user) {
  const actions = document.querySelector('.header-actions');
  if (!actions) return;
  const cartBtn = actions.querySelector('.header-btn-cart');
  if (!cartBtn) return;

  [...actions.children].forEach((el) => {
    if (!el.classList.contains('header-btn-cart')) el.remove();
  });

  if (user?.email) {
    const accountLink = document.createElement('a');
    accountLink.href = '/account';
    accountLink.className = 'header-btn header-icon-btn';
    accountLink.setAttribute('aria-label', 'আমার অ্যাকাউন্ট');
    accountLink.innerHTML = `${USER_ICON_SVG}<span class="only-desktop">আমার অ্যাকাউন্ট</span>`;

    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'header-btn only-desktop';
    logoutBtn.textContent = 'লগআউট';
    logoutBtn.addEventListener('click', () => logout());

    actions.insertBefore(accountLink, cartBtn);
    actions.insertBefore(logoutBtn, cartBtn);
    return;
  }

  const mobileLogin = document.createElement('button');
  mobileLogin.type = 'button';
  mobileLogin.className = 'header-btn header-icon-btn only-mobile';
  mobileLogin.setAttribute('aria-label', 'লগইন');
  mobileLogin.innerHTML = USER_ICON_SVG;
  mobileLogin.addEventListener('click', () => openModal('loginModal'));

  const desktopLogin = document.createElement('button');
  desktopLogin.type = 'button';
  desktopLogin.className = 'header-btn only-desktop';
  desktopLogin.innerHTML = '👤 <span>লগইন</span>';
  desktopLogin.addEventListener('click', () => openModal('loginModal'));

  actions.insertBefore(mobileLogin, cartBtn);
  actions.insertBefore(desktopLogin, cartBtn);
}

async function refreshNavContext() {
  try {
    const res = await fetch('/api/nav-context', { credentials: 'same-origin' });
    if (!res.ok) return;
    const data = await res.json();
    const el = document.getElementById('cartCount');
    if (el && typeof data.cartCount === 'number') {
      el.textContent = String(data.cartCount);
    }
    patchHeaderAuth(data.user);
  } catch {
    /* ignore */
  }
}

async function logout() {
  await api('/auth/logout', { method: 'POST' });
  clearPageCaches();
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

const productCarousels = [];

function initCarousel({ blockId, trackId, cardSelector = '.product-card', intervalMs = 4000 }) {
  const block = document.getElementById(blockId);
  const track = document.getElementById(trackId);
  if (!block || !track) return null;

  const cards = track.querySelectorAll(cardSelector);
  const half = Math.floor(cards.length / 2);
  if (half < 2) return null;

  const state = { index: 0, paused: false, timer: null };

  function stepWidth() {
    const card = cards[0];
    if (!card) return 0;
    const gap = parseFloat(getComputedStyle(track).gap) || 16;
    return card.offsetWidth + gap;
  }

  function go(i, animate) {
    track.style.transition = animate ? 'transform 0.55s ease-in-out' : 'none';
    track.style.transform = `translate3d(-${i * stepWidth()}px, 0, 0)`;
  }

  function tick() {
    if (state.paused) return;
    state.index += 1;
    go(state.index, true);
    if (state.index >= half) {
      setTimeout(() => {
        state.index = 0;
        go(0, false);
      }, 580);
    }
  }

  function start() {
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(tick, intervalMs);
  }

  function stop() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    track.style.transform = '';
    return { stop };
  }

  go(0, false);
  start();

  block._carouselState = state;

  if (!block.dataset.carouselBound) {
    block.dataset.carouselBound = '1';
    block.addEventListener('mouseenter', () => {
      if (block._carouselState) block._carouselState.paused = true;
    });
    block.addEventListener('mouseleave', () => {
      if (block._carouselState) block._carouselState.paused = false;
    });
    window.addEventListener('resize', () => {
      const s = block._carouselState;
      if (s) go(s.index, false);
    });
  }

  return { stop, start };
}

function initProductCarousel(opts) {
  return initCarousel({ ...opts, cardSelector: '.product-card' });
}

function initStoreCarousels() {
  productCarousels.forEach((c) => c?.stop?.());
  productCarousels.length = 0;
  const flash = initProductCarousel({
    blockId: 'flashCarousel',
    trackId: 'flashProducts',
    intervalMs: 4000,
  });
  const arrivals = initProductCarousel({
    blockId: 'newArrivalsCarousel',
    trackId: 'newArrivalsTrack',
    intervalMs: 4000,
  });
  const reviews = initCarousel({
    blockId: 'reviewsCarousel',
    trackId: 'reviewsTrack',
    cardSelector: '.review-card',
    intervalMs: 5000,
  });
  document.querySelectorAll('[data-category-carousel]').forEach((block) => {
    const slug = block.id.replace(/^carousel-/, '');
    const c = initProductCarousel({
      blockId: block.id,
      trackId: `track-${slug}`,
      intervalMs: 4000,
    });
    if (c) productCarousels.push(c);
  });
  if (flash) productCarousels.push(flash);
  if (arrivals) productCarousels.push(arrivals);
  if (reviews) productCarousels.push(reviews);
}

function bootStoreCarousels() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootHomePage);
  } else {
    bootHomePage();
  }
  document.addEventListener('wn:fast-page', () => {
    requestAnimationFrame(bootHomePage);
  });
}

bootStoreCarousels();

refreshCart();
loadPaymentMethods();
refreshNavContext();

if (new URLSearchParams(location.search).get('login') === '1') {
  openModal('loginModal');
}

window.openModal = openModal;
window.closeModal = closeModal;
window.signInWithGoogle = signInWithGoogle;
window.login = login;
window.register = register;
window.logout = logout;
window.toggleCart = toggleCart;
window.patchHeaderAuth = patchHeaderAuth;
window.refreshNavContext = refreshNavContext;
window.clearPageCaches = clearPageCaches;

