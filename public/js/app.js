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

(function wallNestStoreApp() {
  if (window.__WN_APP_READY__) {
    requestAnimationFrame(() => {
      if (typeof window.mountMobileMenu === 'function') window.mountMobileMenu();
      if (typeof window.refreshCart === 'function') window.refreshCart();
      if (typeof window.syncStoreMobileNavActive === 'function') window.syncStoreMobileNavActive();
      if (typeof window.updateStoreMobileNavBadges === 'function') window.updateStoreMobileNavBadges();
      if (typeof window.refreshAccountDashboard === 'function') window.refreshAccountDashboard();
      if (typeof window.initCheckoutPage === 'function') window.initCheckoutPage();
      if (typeof window.initCartPage === 'function') window.initCartPage();
      if (typeof window.initTrackOrderPage === 'function') window.initTrackOrderPage();
    });
    return;
  }
  window.__WN_APP_READY__ = true;

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
    insideDhakaFee: Number(cfg.insideDhakaFee ?? cfg.shippingFee) || 60,
    outsideDhakaFee: Number(cfg.outsideDhakaFee ?? cfg.shippingFee) || 120,
  };
}

function getSelectedDeliveryArea() {
  const checked = document.querySelector('input[name="deliveryArea"]:checked');
  return checked?.value || 'inside_dhaka';
}

function calcShipping(subtotal, deliveryArea) {
  const { freeShippingMin, insideDhakaFee, outsideDhakaFee } = getStoreShippingConfig();
  if (Number(subtotal) >= freeShippingMin) return 0;
  const area = deliveryArea || getSelectedDeliveryArea();
  return area === 'outside_dhaka' ? outsideDhakaFee : insideDhakaFee;
}

function updateDeliveryAreaFeeLabels(subtotal = 0) {
  const { freeShippingMin, insideDhakaFee, outsideDhakaFee } = getStoreShippingConfig();
  const insideEl = document.getElementById('insideDhakaFeeLabel');
  const outsideEl = document.getElementById('outsideDhakaFeeLabel');
  const label = (fee) =>
    Number(subtotal) >= freeShippingMin ? 'ফ্রি' : formatBDT(fee);
  if (insideEl) insideEl.textContent = label(insideDhakaFee);
  if (outsideEl) outsideEl.textContent = label(outsideDhakaFee);
}

function bindDeliveryAreaEvents() {
  const box = document.getElementById('deliveryAreaOptions');
  if (!box || box.dataset.bound === '1') return;
  box.dataset.bound = '1';
  box.addEventListener('change', (e) => {
    if (e.target.name !== 'deliveryArea') return;
    if (window.__cartItems) {
      const subtotal = cartLineSubtotal(
        window.__cartItems,
        window.__cartItems.reduce((s, i) => s + i.price * i.qty, 0)
      );
      renderCheckoutOrderSummary(window.__cartItems, subtotal);
    }
    if (selectedPayment) selectPayment(selectedPayment);
  });
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
          <button type="button" class="btn-add-cart" data-product-id="${p.id}" onclick="event.preventDefault(); event.stopPropagation(); addToCart(${JSON.stringify(p.id)})">🛒 কার্টে যোগ</button>
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
  const menus = [...document.querySelectorAll('#mobileMenu')];
  if (!menus.length) return;
  const menu = menus[menus.length - 1];
  menus.forEach((node) => {
    if (node !== menu) node.remove();
  });
  if (menu.parentElement !== document.body) {
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
  if (!document.getElementById('mobileMenu')) return;
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

window.mountMobileMenu = mountMobileMenu;
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
    setCartCount(data.count);
    const p = products.find((x) => x.id === id) || { name: 'Product' };
    showToast(`✅ "${p.name}" কার্টে যোগ হয়েছে!`);
    await refreshCart();
  } catch (e) {
    showToast(e.message, 'warning');
  }
}

async function buyNow(id) {
  await addToCart(id);
  window.location.href = '/checkout';
}

async function refreshCart() {
  try {
    const { items, count, subtotal } = await api('/cart');
    setCartCount(count);
    renderCartItems(items, subtotal);
    updateAddToCartButtonStates(items);
  } catch (e) {
    console.error(e);
  }
}

const CART_BTN_LABEL = {
  default: '🛒 কার্টে যোগ',
  defaultLg: '🛒 কার্টে যোগ করুন',
  inCart: '✅ কার্টে আছে',
};

function productInCart(items, productId, sizeLabel = '') {
  const pid = String(productId);
  const size = String(sizeLabel || '').trim();
  if (size) {
    return (items || []).some(
      (i) => String(i.id) === pid && String(i.sizeLabel || '').trim() === size
    );
  }
  return (items || []).some((i) => String(i.id) === pid);
}

function setAddToCartButtonState(btn, inCart) {
  if (!btn) return;
  if (btn.disabled) {
    btn.classList.remove('in-cart');
    return;
  }
  const isLarge = btn.classList.contains('btn-lg');
  const defaultText = isLarge ? CART_BTN_LABEL.defaultLg : CART_BTN_LABEL.default;
  btn.classList.toggle('in-cart', inCart);
  btn.textContent = inCart ? CART_BTN_LABEL.inCart : defaultText;
  btn.setAttribute('aria-pressed', inCart ? 'true' : 'false');
}

function updateAddToCartButtonStates(items = []) {
  window.__cartItems = items;
  document
    .querySelectorAll('.product-footer .btn-add-cart, .product-actions .btn-add-cart')
    .forEach((btn) => {
      const card = btn.closest('[data-product-id]');
      const productId =
        btn.dataset.productId || card?.dataset?.productId || window.__PRODUCT_PAGE__?.id;
      if (!productId) return;
      const isProductPageBtn = Boolean(btn.closest('.product-actions'));
      const sizeLabel =
        isProductPageBtn && typeof window.getSelectedSizeLabel === 'function'
          ? window.getSelectedSizeLabel()
          : '';
      setAddToCartButtonState(btn, productInCart(items, productId, sizeLabel));
    });
}

function cartLineSubtotal(items, subtotal) {
  const computed = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return typeof subtotal === 'number' ? subtotal : computed;
}

function renderCartItems(items, subtotal) {
  const container = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const headerCount = document.getElementById('cartHeaderCount');
  const cartPage = document.getElementById('cartPage');
  const emptyEl = document.getElementById('cartEmpty');
  const layoutEl = document.getElementById('cartLayout');
  const pageHeaderCount = document.getElementById('cartPageHeaderCount');
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  if (cartPage) {
    if (!items.length) {
      if (emptyEl) emptyEl.hidden = false;
      if (layoutEl) layoutEl.hidden = true;
    } else {
      if (emptyEl) emptyEl.hidden = true;
      if (layoutEl) layoutEl.hidden = false;
    }
    if (pageHeaderCount) {
      pageHeaderCount.textContent = itemCount ? `(${itemCount} আইটেম)` : '';
    }
  }

  if (!container) return;

  if (!items.length) {
    container.innerHTML = `<div class="cart-empty"><div class="ce-icon">🛒</div><p>কার্ট খালি আছে</p><p class="cart-empty-sub">পছন্দের পণ্য কার্টে যোগ করুন</p></div>`;
    if (footer && !cartPage) footer.style.display = 'none';
    if (headerCount) headerCount.textContent = '';
    return;
  }
  if (footer && !cartPage) footer.style.display = 'block';
  const lineSubtotal = cartLineSubtotal(items, subtotal);
  const shipping = calcShipping(lineSubtotal, 'inside_dhaka');
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
          <div class="cart-item-name">${escapeHtml(item.displayName || item.name)}</div>
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
    { key: 'cod', label: 'Cash on Delivery', color: '#2E7D32' },
  ];
  box.innerHTML = methods
    .filter((m) => paymentSettings[m.key]?.enabled !== false)
    .map(
      (m) => `
    <label class="payment-method-option">
      <input type="radio" name="payMethod" value="${m.key}" onchange="selectPayment('${m.key}')">
      <strong class="payment-method-name" style="color:${m.color}">${paymentSettings[m.key]?.label || m.label}</strong>
      ${m.key === 'cod' ? '' : `<span class="payment-method-number">${paymentSettings[m.key]?.number || ''}</span>`}
    </label>`
    )
    .join('');
}

function setManualPaymentFieldsVisible(visible) {
  const wrap = document.getElementById('manualPaymentFields');
  const paymentPhone = document.getElementById('paymentPhone');
  const transactionId = document.getElementById('transactionId');
  if (wrap) wrap.style.display = visible ? '' : 'none';
  if (paymentPhone) paymentPhone.required = visible;
  if (transactionId) transactionId.required = visible;
  if (!visible) {
    if (paymentPhone) paymentPhone.value = '';
    if (transactionId) transactionId.value = '';
  }
}

function selectPayment(key) {
  selectedPayment = key;
  const p = paymentSettings[key];
  const el = document.getElementById('paymentDetails');
  if (!el || !p) return;
  const isCod = key === 'cod';
  setManualPaymentFieldsVisible(!isCod);
  const amount = checkoutTotal > 0 ? checkoutTotal : 0;
  el.style.display = 'block';
  if (isCod) {
    el.innerHTML = `
    <div class="payment-details-head payment-details-head--cod">
      <strong class="payment-details-title">${p.label || 'Cash on Delivery'}</strong>
    </div>
    <div class="payment-details-amount-box payment-details-amount-box--cod">
      <div class="payment-details-amount-label">ডেলিভারিতে পরিশোধ করুন</div>
      <strong class="payment-details-amount">${formatBDT(amount)}</strong>
    </div>
    <p class="payment-details-instructions">${p.instructions || 'পণ্য হাতে পেয়ে কুরিয়ারকে ক্যাশে পেমেন্ট করুন।'}</p>
  `;
    return;
  }
  el.innerHTML = `
    <div class="payment-details-head">
      <strong class="payment-details-title">${p.label || key}</strong>
      <span class="payment-details-type">${p.account_type || 'Personal'}</span>
    </div>
    <div class="payment-details-number-box">
      <span class="payment-details-number-label">পেমেন্ট নম্বর</span>
      <strong class="payment-details-number">${p.number || 'অ্যাডমিনে সেট করুন'}</strong>
    </div>
    <div class="payment-details-amount-box">
      <div class="payment-details-amount-label">Send Money করুন (ঠিক এই পরিমাণ)</div>
      <strong class="payment-details-amount">${formatBDT(amount)}</strong>
    </div>
    <p class="payment-details-instructions">${p.instructions || 'উপরের নম্বরে ঠিক এই টাকা পাঠান, তারপর Transaction ID দিন।'}</p>
  `;
}

function renderCheckoutOrderSummary(items, subtotal) {
  const page = document.getElementById('checkoutPage');
  if (!page) return;

  const emptyEl = document.getElementById('checkoutEmpty');
  const layoutEl = document.getElementById('checkoutLayout');
  const itemsEl = document.getElementById('checkoutOrderItems');

  if (!items.length) {
    if (emptyEl) emptyEl.hidden = false;
    if (layoutEl) layoutEl.hidden = true;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;
  if (layoutEl) layoutEl.hidden = false;

  const lineSubtotal = cartLineSubtotal(items, subtotal);
  const shipping = calcShipping(lineSubtotal, getSelectedDeliveryArea());
  checkoutTotal = lineSubtotal + shipping;
  updateDeliveryAreaFeeLabels(lineSubtotal);

  if (itemsEl) {
    itemsEl.innerHTML = items
      .map(
        (item) => `
      <li class="checkout-order-item">
        <div class="checkout-order-item-img">${item.imageUrl ? `<img src="${item.imageUrl}" alt="">` : item.icon}</div>
        <div class="checkout-order-item-body">
          <div class="checkout-order-item-name">${escapeHtml(truncateTitle(item.displayName || item.name))}</div>
          <div class="checkout-order-item-meta">${formatBDT(item.price)} × ${item.qty}</div>
        </div>
        <div class="checkout-order-item-price">${formatBDT(item.price * item.qty)}</div>
      </li>`
      )
      .join('');
  }

  const subtotalEl = document.getElementById('checkoutSubtotal');
  const shippingEl = document.getElementById('checkoutShipping');
  const grandEl = document.getElementById('checkoutGrandTotal');
  if (subtotalEl) subtotalEl.textContent = formatBDT(lineSubtotal);
  if (shippingEl) {
    shippingEl.textContent = shipping === 0 ? 'ফ্রি' : formatBDT(shipping);
    shippingEl.classList.toggle('is-free', shipping === 0);
  }
  if (grandEl) grandEl.textContent = formatBDT(checkoutTotal);
}

async function prepareCheckoutForm() {
  syncCheckoutStickyOffset();
  bindCheckoutStickyOffset();
  await loadPaymentMethods();
  selectedPayment = null;
  const paymentDetails = document.getElementById('paymentDetails');
  if (paymentDetails) paymentDetails.style.display = 'none';
  setManualPaymentFieldsVisible(true);
  renderPaymentOptions();
  bindDeliveryAreaEvents();

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
}

async function initCheckoutPage() {
  await prepareCheckoutForm();
  try {
    const { items, count, subtotal } = await api('/cart');
    setCartCount(count);
    renderCheckoutOrderSummary(items, subtotal);
    renderPaymentOptions();
  } catch (e) {
    console.error(e);
  }
}

window.initCheckoutPage = initCheckoutPage;

function syncCheckoutStickyOffset() {
  if (!document.getElementById('checkoutPage') && !document.getElementById('cartPage')) return;
  const shell = document.querySelector('.site-header-sticky');
  const header = document.querySelector('header');
  const offset = (shell?.offsetHeight || header?.offsetHeight || 72) + 16;
  document.documentElement.style.setProperty('--checkout-stick-top', `${offset}px`);
}

function bindCheckoutStickyOffset() {
  syncCheckoutStickyOffset();
  if (window.__checkoutStickyBound) return;
  window.__checkoutStickyBound = true;
  window.addEventListener('resize', syncCheckoutStickyOffset, { passive: true });
}

async function openCheckout() {
  window.location.href = '/checkout';
}

async function changeQty(cartItemId, delta) {
  try {
    const data = await api(`/cart/${cartItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ delta }),
    });
    renderCartItems(data.items, data.subtotal);
    setCartCount(data.count);
  } catch (e) {
    showToast(e.message, 'warning');
  }
}

async function removeFromCart(cartItemId) {
  try {
    const data = await api(`/cart/${cartItemId}`, { method: 'DELETE' });
    renderCartItems(data.items, data.subtotal);
    setCartCount(data.count);
  } catch (e) {
    showToast(e.message, 'warning');
  }
}

function toggleCart() {
  window.location.href = '/cart';
}

async function initCartPage() {
  syncCheckoutStickyOffset();
  bindCheckoutStickyOffset();
  try {
    const { items, count, subtotal } = await api('/cart');
    setCartCount(count);
    renderCartItems(items, subtotal);
    updateAddToCartButtonStates(items);
  } catch (e) {
    console.error(e);
  }
}

window.initCartPage = initCartPage;

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
  updateStoreMobileNavBadges();
}

function setCartCount(count) {
  const n = String(count);
  const el = document.getElementById('cartCount');
  if (el) el.textContent = n;
  const headerBadge = document.querySelector('[data-cart-count-badge]');
  if (headerBadge) headerBadge.textContent = n;
  updateStoreMobileNavBadges();
}

function updateStoreMobileNavBadges() {
  const cartEl = document.getElementById('storeMnavCartBadge');
  const wishEl = document.getElementById('storeMnavWishBadge');
  const headerCart = document.getElementById('cartCount');
  const cartCount = Number(headerCart?.textContent || 0);
  if (cartEl) {
    if (cartCount > 0) {
      cartEl.textContent = String(cartCount);
      cartEl.hidden = false;
    } else {
      cartEl.hidden = true;
    }
  }
  const wishCount = getWishlist().length;
  if (wishEl) {
    if (wishCount > 0) {
      wishEl.textContent = String(wishCount);
      wishEl.hidden = false;
    } else {
      wishEl.hidden = true;
    }
  }
}

function syncStoreMobileNavActive() {
  const nav = document.getElementById('storeMobileNav');
  if (!nav) return;
  const path = window.location.pathname;
  const tab = new URLSearchParams(window.location.search).get('tab');
  nav.querySelectorAll('.store-mnav-item').forEach((el) => el.classList.remove('is-active'));
  if (path === '/cart') {
    document.getElementById('storeMnavCart')?.classList.add('is-active');
    return;
  }
  if (path === '/account' && tab === 'wishlist') {
    document.getElementById('storeMnavWishlist')?.classList.add('is-active');
    return;
  }
  if (path === '/account') {
    nav.querySelector('a.store-mnav-item[href="/account"]')?.classList.add('is-active');
  }
}

function bindStoreMobileNav() {
  if (window.__wnStoreMobileNavBound) return;
  window.__wnStoreMobileNavBound = true;

  document.addEventListener('click', (e) => {
    if (e.target.closest('#storeMnavCategories')) {
      e.preventDefault();
      openNavMenu();
      return;
    }
    const mnavLink = e.target.closest('#storeMobileNav a.store-mnav-item[href]');
    if (mnavLink) {
      closeNavMenu();
    }
  });

  window.addEventListener('popstate', syncStoreMobileNavActive);
  document.addEventListener('wn:fast-page', () => {
    requestAnimationFrame(() => {
      mountMobileMenu();
      syncStoreMobileNavActive();
    });
  });
  document.addEventListener('wn:fast-account', () => {
    requestAnimationFrame(syncStoreMobileNavActive);
  });
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
    const isCod = selectedPayment === 'cod';
    const data = await api('/orders', {
      method: 'POST',
      body: JSON.stringify({
        shipping_name: document.getElementById('shipName').value,
        shipping_phone: document.getElementById('shipPhone').value,
        customer_email: document.getElementById('checkoutEmail')?.value?.trim() || undefined,
        shipping_address: document.getElementById('shipAddress').value,
        delivery_area: getSelectedDeliveryArea(),
        payment_method: selectedPayment,
        payment_phone: isCod ? undefined : document.getElementById('paymentPhone').value,
        transaction_id: isCod ? undefined : document.getElementById('transactionId').value,
        customer_note: document.getElementById('customerNote').value,
      }),
    });
    if (document.getElementById('checkoutModal')) {
      closeModal('checkoutModal');
    }
    await refreshCart();
    showToast(
      isCod
        ? `🎉 অর্ডার ${data.orderNumber} জমা হয়েছে! ডেলিভারিতে পেমেন্ট করুন`
        : `🎉 অর্ডার ${data.orderNumber} জমা হয়েছে! পেমেন্ট যাচাই হচ্ছে`
    );
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
    accountLink.className = 'header-btn header-icon-btn only-desktop';
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
    if (typeof data.cartCount === 'number') {
      setCartCount(data.cartCount);
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
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = type === 'warning' ? 'toast toast-warning' : 'toast';
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
    requestAnimationFrame(() => {
      mountMobileMenu();
      bootHomePage();
      refreshCart();
      updateStoreMobileNavBadges();
      syncStoreMobileNavActive();
    });
  });
}

bootStoreCarousels();

refreshCart();
loadPaymentMethods();
refreshNavContext();
bindStoreMobileNav();
updateStoreMobileNavBadges();
syncStoreMobileNavActive();

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
window.setCartCount = setCartCount;
window.syncStoreMobileNavActive = syncStoreMobileNavActive;
window.openNavMenu = openNavMenu;
window.updateStoreMobileNavBadges = updateStoreMobileNavBadges;
window.patchHeaderAuth = patchHeaderAuth;
window.refreshNavContext = refreshNavContext;
window.updateAddToCartButtonStates = updateAddToCartButtonStates;
window.refreshCart = refreshCart;

})();

