(function () {
  const cfg = window.__OFFER_MS__ || {};
  const form = document.getElementById('offerMsForm');
  if (!form) return;

  const qtyInput = document.getElementById('offerQty');
  const totalAmt = document.getElementById('totalAmt');
  const errorEl = document.getElementById('offerFormError');
  const submitBtn = document.getElementById('offerSubmitBtn');

  function toBanglaDigits(value) {
    return String(value).replace(/\d/g, (digit) => '০১২৩৪৫৬৭৮৯'[digit]);
  }

  function startDailyCountdown() {
    const countdown = document.getElementById('offerCountdown');
    if (!countdown) return;

    const now = new Date();
    const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const storageKey = `wn_offer_countdown_${dayKey}`;
    let deadline = 0;
    try {
      deadline = Number(localStorage.getItem(storageKey)) || 0;
    } catch (storageError) {
      // A private browsing restriction should not stop the countdown.
    }
    if (!deadline || deadline <= now.getTime()) {
      deadline = now.getTime() + 24 * 60 * 60 * 1000;
      try {
        localStorage.setItem(storageKey, String(deadline));
      } catch (storageError) {
        // The in-memory deadline still works for this page view.
      }
    }

    function renderCountdown() {
      const remaining = Math.max(0, deadline - Date.now());
      const totalSeconds = Math.floor(remaining / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      countdown.textContent = [
        hours,
        minutes,
        seconds,
      ].map((part) => toBanglaDigits(String(part).padStart(2, '0'))).join(':');
      if (remaining <= 0) window.location.reload();
    }

    renderCountdown();
    window.setInterval(renderCountdown, 1000);
  }

  function setupOfferInteractions() {
    document.querySelectorAll('a[href="#order"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const order = document.getElementById('order');
        if (!order) return;
        event.preventDefault();
        order.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

  }

  startDailyCountdown();
  setupOfferInteractions();

  function formatBDT(n) {
    return `৳${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
  }

  function getQty() {
    return Math.max(1, Math.min(10, Number(qtyInput?.value) || 1));
  }

  function setQty(n) {
    const qty = Math.max(1, Math.min(10, n));
    if (qtyInput) qtyInput.value = String(qty);
    updateTotals();
  }

  function selectedArea() {
    return form.querySelector('input[name="deliveryArea"]:checked')?.value || 'inside_dhaka';
  }

  function shippingFee(subtotal) {
    const freeMin = Number(cfg.freeMin) || 1500;
    if (subtotal >= freeMin) return 0;
    return selectedArea() === 'outside_dhaka'
      ? Number(cfg.outsideFee) || 120
      : Number(cfg.insideFee) || 80;
  }

  function updateTotals() {
    const qty = getQty();
    const unit = Number(cfg.price) || Number(document.getElementById('offerUnitPrice')?.value) || 0;
    const subtotal = unit * qty;
    const ship = shippingFee(subtotal);
    if (totalAmt) totalAmt.textContent = formatBDT(subtotal + ship);

    const freeMin = Number(cfg.freeMin) || 1500;
    const insideLabel = document.getElementById('offerInsideLabel');
    const outsideLabel = document.getElementById('offerOutsideLabel');
    if (insideLabel) {
      insideLabel.textContent =
        subtotal >= freeMin ? 'ফ্রি' : formatBDT(Number(cfg.insideFee) || 80);
    }
    if (outsideLabel) {
      outsideLabel.textContent =
        subtotal >= freeMin ? 'ফ্রি' : formatBDT(Number(cfg.outsideFee) || 120);
    }
  }

  document.getElementById('qtyPlus')?.addEventListener('click', () => setQty(getQty() + 1));
  document.getElementById('qtyMinus')?.addEventListener('click', () => setQty(getQty() - 1));
  form.addEventListener('change', updateTotals);
  updateTotals();

  async function api(path, options = {}) {
    if (typeof window.api === 'function') {
      return window.api(path, options);
    }
    const res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg || '';
    errorEl.classList.toggle('is-visible', !!msg);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');

    if (form.getAttribute('data-product-missing') === '1') {
      showError('অর্ডার চালু করতে আগে অফার পণ্যটি ক্যাটালগে যোগ করুন।');
      return;
    }

    const name = document.getElementById('offerName')?.value?.trim();
    const phone = document.getElementById('offerPhone')?.value?.trim();
    let address = document.getElementById('offerAddress')?.value?.trim();
    const note = document.getElementById('offerNote')?.value?.trim();
    const qty = getQty();
    const productId =
      document.getElementById('offerProductId')?.value || cfg.productId;
    const sizeLabel =
      document.getElementById('offerSizeLabel')?.value || cfg.sizeLabel || '15W';

    if (!name || !phone || !address) {
      showError('নাম, মোবাইল ও ঠিকানা দিন');
      return;
    }
    if (!/^01\d{9}$/.test(phone.replace(/[\s-]/g, ''))) {
      showError('সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)');
      return;
    }
    if (!productId) {
      showError('পণ্য পাওয়া যায়নি');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'অর্ডার হচ্ছে…';
    }

    try {
      await api('/cart/clear', { method: 'POST', body: '{}' });
      await api('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: qty, sizeLabel }),
      });
      const data = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          shipping_name: name,
          shipping_phone: phone.replace(/[\s-]/g, ''),
          shipping_address: address,
          delivery_area: selectedArea(),
          payment_method: 'cod',
          customer_note: note || undefined,
        }),
      });
      if (typeof window.refreshCart === 'function') await window.refreshCart();
      if (typeof window.showToast === 'function') {
        window.showToast(`🎉 অর্ডার ${data.orderNumber} জমা হয়েছে!`);
      }

      const orderTotal = Number(data.total) || 0;
      if (typeof window.wnMetaPixel?.lead === 'function') {
        window.wnMetaPixel.lead({
          content_name: 'Motion Sensor Offer COD',
          value: orderTotal,
          currency: 'BDT',
        });
      }
      if (typeof window.wnMetaPixel?.purchase === 'function') {
        const pixelPurchaseKey = `wn_pixel_purchase_${data.orderNumber}`;
        let shouldTrackPurchase = true;
        try {
          shouldTrackPurchase = !sessionStorage.getItem(pixelPurchaseKey);
          if (shouldTrackPurchase) sessionStorage.setItem(pixelPurchaseKey, '1');
        } catch (storageError) {
          // Tracking should never block a successful order.
        }
        if (shouldTrackPurchase) {
          window.wnMetaPixel.purchase({
            value: orderTotal,
            currency: 'BDT',
            orderNumber: data.orderNumber,
            numItems: qty,
          });
        }
      }

      const thankYouQs = new URLSearchParams({
        order: data.orderNumber,
      });
      if (orderTotal > 0) thankYouQs.set('value', String(orderTotal));
      thankYouQs.set('qty', String(qty));
      window.location.href = `/offer/motion-sensor-light/thank-you?${thankYouQs.toString()}`;
    } catch (err) {
      showError(err.message || 'অর্ডার ব্যর্থ হয়েছে');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'অর্ডার কনফার্ম করুন';
      }
    }
  });
})();
