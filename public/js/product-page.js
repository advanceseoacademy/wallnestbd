(function () {
  let galleryEventsBound = false;
  let tabEventsBound = false;
  let sizeEventsBound = false;

  function truncateProductName(text, max = 30) {
    const s = String(text || '').trim();
    if (!s) return '';
    if (s.length <= max) return s;
    return `${s.slice(0, max).trimEnd()}...`;
  }

  function getGalleryImages() {
    const p = window.__PRODUCT_PAGE__;
    if (p?.images?.length) return p.images.filter(Boolean);
    const thumbs = Array.from(document.querySelectorAll('.gallery-thumb'));
    if (thumbs.length) return thumbs.map((t) => t.dataset.src).filter(Boolean);
    const main = document.getElementById('galleryImg');
    if (main?.src) return [main.currentSrc || main.src];
    if (p?.imageUrl) return [p.imageUrl];
    return [];
  }

  function syncGalleryPreview(index, images) {
    const src = images[index];
    const main = document.getElementById('galleryImg');
    if (main && src) main.src = src;
    document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
      thumb.classList.toggle('active', i === index);
    });
  }

  function openImageLightbox(src, alt) {
    const images = getGalleryImages();
    if (!images.length || !src) return;

    const existing = document.getElementById('productImageLightbox');
    if (existing) existing.remove();

    let index = images.findIndex(
      (url) => url === src || src.endsWith(url) || url.endsWith(src)
    );
    if (index < 0) index = 0;

    const p = window.__PRODUCT_PAGE__;
    const hasMany = images.length > 1;
    const overlay = document.createElement('div');
    overlay.id = 'productImageLightbox';
    overlay.className = 'product-image-lightbox';
    overlay.innerHTML = `
      <button type="button" class="product-image-lightbox-close" aria-label="বন্ধ করুন">×</button>
      ${hasMany ? '<button type="button" class="product-image-lightbox-nav product-image-lightbox-prev" aria-label="আগের ছবি">‹</button>' : ''}
      <div class="product-image-lightbox-stage">
        <img src="" alt="">
        ${hasMany ? '<span class="product-image-lightbox-counter"></span>' : ''}
      </div>
      ${hasMany ? '<button type="button" class="product-image-lightbox-nav product-image-lightbox-next" aria-label="পরের ছবি">›</button>' : ''}
    `;

    const imgEl = overlay.querySelector('.product-image-lightbox-stage img');
    const counterEl = overlay.querySelector('.product-image-lightbox-counter');
    const prevBtn = overlay.querySelector('.product-image-lightbox-prev');
    const nextBtn = overlay.querySelector('.product-image-lightbox-next');

    const show = (nextIndex) => {
      index = (nextIndex + images.length) % images.length;
      const current = images[index];
      imgEl.src = current;
      imgEl.alt = `${alt || p?.name || 'Product'} — ছবি ${index + 1}`;
      if (counterEl) counterEl.textContent = `${index + 1} / ${images.length}`;
      if (prevBtn) prevBtn.disabled = false;
      if (nextBtn) nextBtn.disabled = false;
      syncGalleryPreview(index, images);
    };

    const close = () => {
      overlay.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (hasMany && e.key === 'ArrowLeft') show(index - 1);
      if (hasMany && e.key === 'ArrowRight') show(index + 1);
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('.product-image-lightbox-close')) close();
    });
    prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      show(index - 1);
    });
    nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      show(index + 1);
    });
    overlay.querySelector('.product-image-lightbox-stage')?.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    show(index);
  }

  function bindGalleryEvents() {
    if (galleryEventsBound) return;
    galleryEventsBound = true;

    document.addEventListener('click', (e) => {
      const thumb = e.target.closest('.gallery-thumb');
      if (thumb && document.getElementById('galleryThumbs')?.contains(thumb)) {
        e.preventDefault();
        const src = thumb.dataset.src;
        const main = document.getElementById('galleryImg');
        if (!src || !main) return;
        main.src = src;
        document.querySelectorAll('.gallery-thumb').forEach((t) => t.classList.remove('active'));
        thumb.classList.add('active');
        return;
      }

      const mainImg = e.target.closest('#galleryImg');
      if (mainImg) {
        const p = window.__PRODUCT_PAGE__;
        openImageLightbox(mainImg.currentSrc || mainImg.src, mainImg.alt || p?.name);
      }
    });
  }

  function bindTabEvents() {
    if (tabEventsBound) return;
    tabEventsBound = true;

    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.product-tab');
      if (!tab || !tab.closest('.product-tabs')) return;
      document.querySelectorAll('.product-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.product-tab-panel').forEach((panel) => panel.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
    });
  }

  function saveRecent(p) {
    const key = 'wn_recent';
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (_) {}
    list = list.filter((x) => x.id !== p.id);
    list.unshift({
      id: p.id,
      slug: p.slug,
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
      <a href="/product/${item.slug || item.id}" class="product-card">
        <div class="product-img">${item.imageUrl ? `<img src="${item.imageUrl}" alt="${(item.name || '').replace(/"/g, '&quot;')}">` : item.icon}</div>
        <div class="product-body">
          <div class="product-name" title="${(item.name || '').replace(/"/g, '&quot;')}">${truncateProductName(item.name)}</div>
          <div class="product-price"><span class="price-current">৳${Number(item.price).toLocaleString('bn-BD')}</span></div>
        </div>
      </a>`
      )
      .join('');
  }

  function formatProductBdt(amount) {
    return `৳${Number(amount).toLocaleString('bn-BD')}`;
  }

  function getSelectedSizeBtn() {
    const container = document.getElementById('productSizeOptions');
    if (!container) return null;
    return container.querySelector('.size-option.active:not([disabled])');
  }

  function getSelectedSizeLabel() {
    return getSelectedSizeBtn()?.dataset.label || '';
  }

  function updateProductPriceFromSize(btn) {
    if (!btn) return;
    const price = Number(btn.dataset.price);
    const original = Number(btn.dataset.original);
    const stock = Number(btn.dataset.stock);
    const current = document.getElementById('productPriceCurrent');
    const origEl = document.getElementById('productPriceOriginal');
    const saveEl = document.getElementById('productPriceSave');
    const fromLabel = document.querySelector('.price-from-label');
    if (fromLabel) fromLabel.style.display = 'none';
    if (current) current.textContent = formatProductBdt(price);
    if (origEl && saveEl) {
      if (original > price) {
        origEl.style.display = '';
        saveEl.style.display = '';
        origEl.textContent = formatProductBdt(original);
        const saveAmt = original - price;
        saveEl.textContent = `সেভ ৳${saveAmt.toLocaleString('bn-BD')} (${Math.round((1 - price / original) * 100)}% ছাড়)`;
      } else {
        origEl.style.display = 'none';
        saveEl.style.display = 'none';
      }
    }
    const stockLine = document.getElementById('productStockLine');
    const qtyInput = document.getElementById('productQty');
    const addBtn = document.querySelector('.product-actions .btn-add-cart');
    const buyBtn = document.querySelector('.product-actions .btn-buy-now');
    if (stockLine) {
      stockLine.className = `product-stock ${stock > 0 ? 'in-stock' : 'out-stock'}`;
      stockLine.textContent =
        stock > 0 ? `✅ স্টকে আছে — ${stock} পিস বাকি` : '❌ স্টক শেষ — শীঘ্রই আসছে';
    }
    if (qtyInput) qtyInput.max = Math.min(Math.max(stock, 1), 99);
    [addBtn, buyBtn].forEach((el) => {
      if (el) el.disabled = stock <= 0;
    });
    if (window.__PRODUCT_PAGE__) {
      window.__PRODUCT_PAGE__.price = price;
      window.__PRODUCT_PAGE__.original = original;
      window.__PRODUCT_PAGE__.stock = stock;
    }
  }

  function bindSizeEvents() {
    if (sizeEventsBound) return;
    sizeEventsBound = true;

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.size-option');
      const container = document.getElementById('productSizeOptions');
      if (!btn || !container?.contains(btn)) return;
      if (btn.disabled) return;
      container.querySelectorAll('.size-option').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      updateProductPriceFromSize(btn);
    });
  }

  function syncSizeSelection() {
    const container = document.getElementById('productSizeOptions');
    if (!container) return;
    const options = container.querySelectorAll('.size-option');
    if (!options.length) return;

    let active = container.querySelector('.size-option.active:not([disabled])');
    if (!active) {
      active = container.querySelector('.size-option:not([disabled])');
      options.forEach((b) => b.classList.remove('active'));
      if (active) active.classList.add('active');
    }
    if (active) updateProductPriceFromSize(active);
  }

  function initProductPage() {
    const p = window.__PRODUCT_PAGE__;
    if (!p) return;

    bindGalleryEvents();
    bindTabEvents();
    bindSizeEvents();
    syncSizeSelection();

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
          body: JSON.stringify({
            productId: id,
            quantity: qty,
            sizeLabel: getSelectedSizeLabel(),
          }),
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
      window.location.href = '/checkout';
    };

    function getSharePayload() {
      const url = window.location.href;
      const text = `${p.name} — ৳${p.price} | WallNest BD`;
      return { url, text };
    }

    function openSharePopup(shareUrl) {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=640,height=520');
    }

    window.shareWhatsApp = function () {
      const { url, text } = getSharePayload();
      window.open(
        `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
        '_blank',
        'noopener,noreferrer'
      );
    };

    window.shareFacebook = function () {
      const { url } = getSharePayload();
      openSharePopup(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
      );
    };

    window.shareMessenger = function () {
      const { url } = getSharePayload();
      openSharePopup(
        `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(url)}&display=popup`
      );
    };

    window.shareTelegram = function () {
      const { url, text } = getSharePayload();
      window.open(
        `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
        '_blank',
        'noopener,noreferrer'
      );
    };

    window.shareTwitter = function () {
      const { url, text } = getSharePayload();
      openSharePopup(
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
      );
    };

    window.copyProductLink = function () {
      const { url } = getSharePayload();
      navigator.clipboard.writeText(url).then(() => {
        if (typeof showToast === 'function') showToast('লিংক কপি হয়েছে!');
      });
    };

    saveRecent(p);
  }

  window.initProductPage = initProductPage;
  bindGalleryEvents();
  bindTabEvents();
  bindSizeEvents();

  function bootProductPage() {
    if (window.__PRODUCT_PAGE__) initProductPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootProductPage);
  } else {
    bootProductPage();
  }
})();
