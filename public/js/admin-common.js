if (typeof window !== 'undefined' && typeof window.runAdminPageInit !== 'function') {
  window.runAdminPageInit = function runAdminPageInitStub(fn) {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (typeof fn === 'function') {
          try {
            const p = fn();
            if (p && typeof p.catch === 'function') p.catch(console.error);
          } catch (err) {
            console.error(err);
          }
        }
      })
    );
  };
}
if (typeof window !== 'undefined' && typeof window.bootAdminPage !== 'function') {
  window.bootAdminPage = function bootAdminPageStub(_id, fn) {
    window.runAdminPageInit(fn);
  };
}

async function adminApi(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message;
    const msg =
      (typeof detail === 'string' && detail && detail !== 'Bad Request'
        ? detail
        : null) ||
      (typeof data.error === 'string' && data.error !== 'Bad Request' ? data.error : null) ||
      detail ||
      data.error ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function adminUploadError(data, fallback) {
  if (!data || typeof data !== 'object') return fallback;
  const msg = data.error || data.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg && msg !== 'Bad Request') return msg;
  return fallback;
}

function formatBDT(n) {
  return `৳${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatStatNum(n) {
  return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function paymentLabel(method) {
  return { bkash: 'bKash', rocket: 'Rocket', nagad: 'Nagad', cod: 'Cash on Delivery' }[method] || method || '-';
}

function paymentStatusBadge(status) {
  const map = {
    pending: ['pending', '🕐 পেন্ডিং'],
    submitted: ['processing', '📤 জমা হয়েছে'],
    verified: ['delivered', '✅ যাচাইকৃত'],
    rejected: ['cancelled', '❌ প্রত্যাখ্যান'],
  };
  const [cls, label] = map[status] || ['pending', status];
  return `<span class="status-badge ${cls}"><div class="status-dot"></div>${label}</span>`;
}

function updateClock() {
  const el = document.getElementById('dateChip');
  if (!el) return;
  const now = new Date();
  el.textContent = `📅 ${now.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric' })} · ${now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}`;
}

async function loadPendingBadge() {
  try {
    const { pendingPayments } = await adminApi('/stats');
    const badge = document.getElementById('navPendingOrders');
    if (badge && pendingPayments > 0) {
      badge.textContent = pendingPayments;
      badge.style.display = 'inline-block';
    }
  } catch (_) {}
}

setInterval(updateClock, 1000);
updateClock();
loadPendingBadge();

function openAdminModal(overlayId) {
  const el = document.getElementById(overlayId);
  if (!el) return;
  el.classList.add('is-open');
  el.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeAdminModal(overlayId) {
  const el = document.getElementById(overlayId);
  if (!el) return;
  el.classList.remove('is-open');
  el.setAttribute('aria-hidden', 'true');
  if (!document.querySelector('.admin-modal-overlay.is-open')) {
    document.body.style.overflow = '';
  }
}

function bindAdminModal(overlayId, onClose) {
  const el = document.getElementById(overlayId);
  if (!el) return;
  el.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', onClose);
  });
  el.addEventListener('click', (e) => {
    if (e.target === el) onClose();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.classList.contains('is-open')) onClose();
  });
}

/** Run page init after AdminShell swaps #adminMain (avoids null innerHTML / onclick). */
function runAdminPageInit(fn) {
  const run = () => {
    if (typeof fn !== 'function') return;
    try {
      const p = fn();
      if (p && typeof p.catch === 'function') p.catch(console.error);
    } catch (err) {
      console.error(err);
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
}

/**
 * AdminShell injects page scripts on each client nav — wrap page files in an IIFE
 * and call this so `let`/`const` are not redeclared and listeners stay single.
 */
function bootAdminPage(moduleId, initFn) {
  const initKey = `__wnAdminInit_${moduleId}`;
  const bootKey = `__wnAdminBoot_${moduleId}`;
  window[initKey] = initFn;
  if (!window[bootKey]) {
    window[bootKey] = true;
    document.addEventListener('wn:admin-main', () => {
      if (typeof window[initKey] === 'function') runAdminPageInit(window[initKey]);
    });
  }
  runAdminPageInit(initFn);
}

function clearAdminShellCache() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith('wn_admin_'))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  window.adminApi = adminApi;
  window.adminUploadError = adminUploadError;
  window.formatBDT = formatBDT;
  window.formatStatNum = formatStatNum;
  window.paymentLabel = paymentLabel;
  window.paymentStatusBadge = paymentStatusBadge;
  window.openAdminModal = openAdminModal;
  window.closeAdminModal = closeAdminModal;
  window.bindAdminModal = bindAdminModal;
  window.runAdminPageInit = runAdminPageInit;
  window.bootAdminPage = bootAdminPage;
  window.clearAdminShellCache = clearAdminShellCache;
}
