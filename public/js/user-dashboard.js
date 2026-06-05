/* User dashboard — 100% dynamic (server + API, no demo data) */
/* WISH_KEY lives in app.js — do not redeclare (breaks entire script) */
const WISH_STORAGE = 'wn_wishlist';

let accountRaw = null;
let orders = [];
let wishItems = [];
let notifications = [];
let profileSnapshot = null;

const statusLabels = {
  delivered: ['delivered', '✅ ডেলিভার্ড'],
  processing: ['processing', '⏳ প্রসেসিং'],
  pending: ['pending', '🕐 পেন্ডিং'],
  cancelled: ['cancelled', '❌ বাতিল'],
  shipped: ['shipped', '🚚 শিপমেন্টে'],
};

const pageTitles = {
  dashboard: 'আমার ড্যাশবোর্ড',
  orders: 'আমার অর্ডার',
  wishlist: 'আমার উইশলিস্ট',
  address: 'ঠিকানা ম্যানেজমেন্ট',
  coupons: 'কুপন ও অফার',
  profile: 'প্রোফাইল সেটিংস',
  notifications: 'নোটিফিকেশন',
  rewards: 'রিওয়ার্ড পয়েন্ট',
};

const REWARD_REDEEM = [
  { icon: '💸', name: '৳৫০ ছাড়', pts: '৫০০ পয়েন্ট' },
  { icon: '🚚', name: 'ফ্রি শিপিং', pts: '২০০ পয়েন্ট' },
  { icon: '🎁', name: 'বোনাস পয়েন্ট', pts: '১,০০০ পয়েন্ট' },
  { icon: '💰', name: '৳১০০ ক্যাশব্যাক', pts: '৮০০ পয়েন্ট' },
];

function emptyState(msg, link, icon = '📭') {
  const linkHtml = link
    ? `<a href="${link.href}" class="ui-empty-link">${link.text}</a>`
    : '';
  return `<div class="ui-empty">
    <div class="ui-empty-icon">${icon}</div>
    <p class="ui-empty-text">${msg}</p>
    ${linkHtml}
  </div>`;
}

function formatPrice(n) {
  return `৳${Number(n || 0).toLocaleString('bn-BD')}`;
}

/** Bangladesh time — Good morning / afternoon / evening / night */
function getTimeGreeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Dhaka',
    }).format(now)
  );
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

function applyTimeGreetings() {
  const greeting = getTimeGreeting();
  setText('welcomeGreeting', greeting);
  const chip = document.getElementById('greetingChip');
  if (chip) chip.textContent = `👋 ${greeting}`;
}

function formatPriceOld(n) {
  if (!n || Number(n) <= 0) return '';
  return formatPrice(n);
}

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'ত্রুটি হয়েছে');
  return data;
}

function mapOrdersFromApi(list) {
  return (list || []).map((o) => ({
    id: o.id,
    icon: o.icon || '🖼️',
    name: o.name,
    price: formatPrice(o.price),
    priceNum: Number(o.price || 0),
    status: o.status,
    date: o.date,
  }));
}

function mapWishItem(w) {
  return {
    icon: w.icon || '🖼️',
    name: w.name || w.nameBn || 'পণ্য',
    price: formatPrice(w.price),
    old: formatPriceOld(w.original),
    id: w.id,
    imageUrl: w.imageUrl,
  };
}

function renderOrderItem(o) {
  const [cls, label] = statusLabels[o.status] || statusLabels.processing;
  return `<div class="order-item">
    <div class="order-img">${o.icon}</div>
    <div class="order-info">
      <div class="order-name">${o.name}</div>
      <div class="order-id">${o.id} · ${o.date}</div>
    </div>
    <div class="order-meta">
      <div class="order-price">${o.price}</div>
      <div class="status-pill ${cls}"><div class="sdot"></div>${label}</div>
    </div>
  </div>`;
}

function renderWishItem(w) {
  const cartBtn = w.id
    ? `<button class="wish-btn" type="button" data-wish-add="${w.id}">কার্টে যোগ</button>`
    : '';
  return `<div class="wish-item">
    <div class="wish-img">${w.imageUrl ? `<img src="${w.imageUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : w.icon}</div>
    <div class="wish-body">
      <div class="wish-name">${w.name}</div>
      <div><span class="wish-price">${w.price}</span><span class="wish-old">${w.old || ''}</span></div>
      ${cartBtn}
    </div>
  </div>`;
}

function renderNotifItem(n) {
  const id = n.id || `notif-${String(n.time || '').replace(/\s/g, '-')}`;
  return `<div class="notif-item ${n.unread ? 'unread' : ''}" data-notif-id="${id}" role="button" tabindex="0" aria-label="নোটিফিকেশন দেখুন">
    <div class="notif-icon ${n.color}">${n.icon}</div>
    <div style="flex:1">
      <div class="notif-text">${n.text}</div>
      <div class="notif-time">${n.time}</div>
    </div>
    ${n.unread ? '<div class="unread-dot"></div>' : ''}
  </div>`;
}

function stripHtml(html) {
  const el = document.createElement('div');
  el.innerHTML = html || '';
  return el.textContent || '';
}

function markNotifRead(id) {
  const n = notifications.find((x) => x.id === id);
  if (!n || !n.unread) return;
  n.unread = false;
  const unread = notifications.filter((item) => item.unread).length;
  setBadge('badgeNotif', unread);
  document.querySelectorAll(`.notif-item[data-notif-id="${id}"]`).forEach((el) => {
    el.classList.remove('unread');
    el.querySelector('.unread-dot')?.remove();
  });
  if (unread === 0) document.querySelector('.tb-notif')?.remove();
}

function openNotifView(id) {
  const n = notifications.find((x) => x.id === id);
  if (!n) return;

  const modal = document.getElementById('notifViewModal');
  const titleEl = document.getElementById('notifViewTitle');
  const iconEl = document.getElementById('notifViewIcon');
  const iconWrap = document.getElementById('notifViewIconWrap');
  const timeEl = document.getElementById('notifViewTime');
  const bodyEl = document.getElementById('notifViewBody');
  const actionEl = document.getElementById('notifViewAction');

  if (titleEl) titleEl.textContent = n.title || 'নোটিফিকেশন';
  if (iconEl) iconEl.textContent = n.icon || '🔔';
  if (iconWrap) {
    iconWrap.className = `notif-view-icon-wrap notif-icon ${n.color || 'blue'}`;
  }
  if (timeEl) timeEl.textContent = n.time || '';
  if (bodyEl) bodyEl.textContent = n.body || stripHtml(n.text);

  if (actionEl) {
    if (n.actionUrl) {
      actionEl.href = n.actionUrl;
      actionEl.textContent = n.actionLabel || 'বিস্তারিত দেখুন';
      actionEl.style.display = 'inline-block';
    } else {
      actionEl.style.display = 'none';
      actionEl.removeAttribute('href');
    }
  }

  modal?.classList.add('open');
  document.body.style.overflow = 'hidden';
  markNotifRead(id);
}

function closeNotifView() {
  document.getElementById('notifViewModal')?.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCouponItem(c) {
  const isFree = c.pct === 'FREE';
  const num = isFree ? 'FREE' : c.pct;
  return `<div class="coupon-item">
    <div class="coupon-pct"><div class="coupon-num" ${isFree ? 'style="font-size:16px"' : ''}>${num}</div><div class="coupon-off">${isFree ? 'SHIP' : '% OFF'}</div></div>
    <div class="coupon-info">
      <div class="coupon-code">${c.code}</div>
      <div class="coupon-desc">${c.desc}</div>
      <div class="coupon-expiry">⏳ ${c.expiry}</div>
    </div>
    <button type="button" class="copy-btn" onclick="copyCode('${c.code}')">কপি করুন</button>
  </div>`;
}

function renderAddressItem(a, i) {
  return `<div class="address-item ${a.isDefault ? 'default' : ''}">
    <div class="addr-icon">${i === 0 ? '🏠' : '🏢'}</div>
    <div class="addr-info">
      <div class="addr-name">${a.name}${i === 0 && a.isDefault ? ' (বাড়ি)' : ''}</div>
      <div class="addr-text">${a.address}${a.city ? '<br>' + a.city + ', বাংলাদেশ' : ''}<br>📞 ${a.phone || '—'}</div>
    </div>
    ${a.isDefault ? '<div class="addr-default">ডিফল্ট</div>' : ''}
  </div>`;
}

function renderTrackingBar(status) {
  const p =
    status === 'delivered' ? 100 : status === 'shipped' ? 55 : status === 'processing' ? 28 : 12;
  const step = (done, active, icon, label) => {
    let cls = 'pending';
    if (active) cls = 'active';
    else if (done) cls = 'done';
    return `<div class="track-step">
      <div class="track-dot ${cls}">${icon}</div>
      <div class="track-label ${done || active ? 'done' : ''}">${label}</div>
    </div>`;
  };
  return `
    ${step(p >= 12, false, p >= 12 ? '✓' : '○', 'অর্ডার<br>হয়েছে')}
    ${step(p >= 28, false, p >= 28 ? '✓' : '○', 'প্যাক<br>হয়েছে')}
    ${step(p >= 55, status === 'shipped', status === 'shipped' ? '🚚' : p >= 55 ? '✓' : '○', 'শিপমেন্টে')}
    ${step(p >= 100, false, '📍', 'ডেলিভারি')}`;
}

function setBadge(id, count) {
  const ids = [id];
  const mnavMap = {
    badgeOrders: 'mnavBadgeOrders',
    badgeNotif: 'mnavBadgeNotif',
    badgeCoupons: 'mnavBadgeCoupons',
  };
  if (mnavMap[id]) ids.push(mnavMap[id]);

  ids.forEach((badgeId) => {
    const el = document.getElementById(badgeId);
    if (!el) return;
    if (count > 0) {
      el.textContent = String(count);
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function tierGoal(tier) {
  if (tier === 'প্লাটিনাম') return 3000;
  if (tier === 'গোল্ড') return 3000;
  return 1500;
}

function updateRewardsUI(points, tier) {
  const pts = Number(points || 0);
  const ptsBn = pts.toLocaleString('bn-BD');
  const goal = tierGoal(tier);
  const remain = Math.max(0, goal - pts);
  const pct = goal ? Math.min(100, Math.round((pts / goal) * 100)) : 0;

  setText('dashRewardPoints', ptsBn);
  setText('rewardsPagePoints', ptsBn);
  setText('dashRewardPtsLabel', `${ptsBn} পয়েন্ট`);
  setText('rewardsPagePtsLabel', `${ptsBn} / ${goal.toLocaleString('bn-BD')}`);

  const goalMsg = remain
    ? `${tier} → প্লাটিনামের জন্য ${remain.toLocaleString('bn-BD')} বাকি`
    : 'প্লাটিনাম লেভেল অর্জিত';
  setText('dashRewardGoalLabel', goalMsg);
  setText('rewardsPageGoalLabel', remain ? 'প্লাটিনাম লেভেল' : 'সর্বোচ্চ লেভেল');
  setText('rewardsPageSub', `আপনি ${tier} মেম্বার${remain ? ` — আরও ${remain.toLocaleString('bn-BD')} পয়েন্টে প্লাটিনাম!` : '!'}`);

  const fill = document.getElementById('dashRewardFill');
  if (fill) fill.style.width = pct + '%';
  const fill2 = document.getElementById('rewardsPageFill');
  if (fill2) fill2.style.width = pct + '%';
}

function updateTracking(tracking) {
  const card = document.getElementById('trackingCard');
  if (!card) return;
  if (!tracking) {
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  setText('trackingOrderId', tracking.orderId);
  const nameEl = document.getElementById('trackingProductName');
  if (nameEl) nameEl.innerHTML = `<strong>${tracking.name}</strong>`;
  setText(
    'trackingDeliveryNote',
    `স্ট্যাটাস: ${statusLabels[tracking.status]?.[1] || tracking.status}`
  );
  const bar = document.getElementById('trackingBar');
  if (bar) bar.innerHTML = renderTrackingBar(tracking.status);
}

function renderCoupons(coupons) {
  const el = document.getElementById('couponList');
  const label = document.getElementById('couponCountLabel');
  if (!el) return;
  const list = coupons || [];
  if (label) {
    label.textContent = list.length
      ? `${list.length}টি সক্রিয় কুপন`
      : 'কোনো সক্রিয় কুপন নেই';
  }
  el.innerHTML = list.length
    ? list.map(renderCouponItem).join('')
    : emptyState('এখনও কোনো কুপন নেই।');
  setBadge('badgeCoupons', list.length);
}

function renderAddresses(addresses) {
  const el = document.getElementById('addressList');
  if (!el) return;
  const list = addresses || [];
  el.innerHTML = list.length
    ? list.map(renderAddressItem).join('')
    : emptyState('এখনও কোনো সংরক্ষিত ঠিকানা নেই। চেকআউটে অর্ডার করলে ঠিকানা এখানে দেখা যাবে।', {
        href: '/',
        text: 'এখনই শপিং করুন →',
      });
}

function applyAccountData(data) {
  if (!data?.user) {
    console.error('Account data missing user', data);
    return;
  }
  accountRaw = data;
  orders = mapOrdersFromApi(data.orders);
  notifications = data.notifications || [];

  const u = data.user;
  const s = data.stats || {};

  setText('sidebarInitials', u.initials || '—');
  setText('sidebarName', u.displayName || '—');
  setText('sidebarEmail', u.email || '—');
  setText('sidebarTier', `⭐ ${u.tier || 'সিলভার'} মেম্বার`);
  applyTimeGreetings();
  setText('welcomeNameSpan', `${u.displayName || 'গ্রাহক'}!`);
  setText('statOrders', String(s.orderCount ?? 0));
  setText('statPoints', String(s.points ?? 0));
  setText(
    'statRating',
    s.experienceRating != null ? `${s.experienceRating}★` : '—'
  );

  const sub = document.getElementById('welcomeSub');
  if (sub) {
    if (data.tracking) {
      sub.textContent = 'আপনার সর্বশেষ অর্ডার শিপমেন্টে আছে। ট্র্যাক করুন।';
    } else if (s.orderCount > 0) {
      sub.textContent = 'আপনার অর্ডার ও অফার এখানে দেখুন।';
    } else {
      sub.textContent = 'WallNest BD-তে স্বাগতম! প্রথম ওয়াল আর্ট অর্ডার করুন।';
    }
  }

  setText('profileInitials', u.initials || '—');
  setText('profileDisplayName', u.displayName || '—');
  setText('profileMemberLine', `সদস্যপদ: ${u.memberSince || '—'} | ⭐ ${u.tier || 'সিলভার'} মেম্বার`);

  const setVal = (id, v) => {
    const inp = document.getElementById(id);
    if (inp) inp.value = v ?? '';
  };
  setVal('f_first', u.firstName);
  setVal('f_last', u.lastName);
  setVal('f_email', u.email);
  setVal('f_phone', u.phone);
  setVal('f_dob', '');
  setVal('f_gender', '');
  const addr = data.addresses?.[0];
  setVal('f_addr', addr ? [addr.address, addr.city].filter(Boolean).join(', ') : '');

  profileSnapshot = {
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    phone: u.phone || '',
  };

  setBadge('badgeOrders', s.activeOrders || 0);
  const unread = notifications.filter((n) => n.unread).length;
  setBadge('badgeNotif', unread);

  updateRewardsUI(s.points, u.tier);
  updateTracking(data.tracking);
  renderAddresses(data.addresses);
  renderCoupons(data.coupons);
}

function paintLists() {
  const orderEmpty = emptyState('এখনও কোনো অর্ডার নেই।', { href: '/', text: 'পণ্য দেখুন →' }, '📦');
  const wishEmpty = emptyState('উইশলিস্ট খালি। পণ্যে ❤️ চাপুন।', { href: '/', text: 'পণ্য ব্রাউজ করুন →' }, '❤️');

  const dashOrders = document.getElementById('dashOrderList');
  if (dashOrders) {
    dashOrders.innerHTML = orders.length
      ? orders.slice(0, 3).map(renderOrderItem).join('')
      : orderEmpty;
  }

  const fullOrders = document.getElementById('fullOrderList');
  if (fullOrders && !fullOrders.dataset.filtered) {
    fullOrders.innerHTML = orders.length
      ? orders.map(renderOrderItem).join('')
      : orderEmpty;
  }

  const dashNotif = document.getElementById('dashNotifList');
  if (dashNotif) {
    dashNotif.innerHTML = notifications.length
      ? notifications.slice(0, 3).map(renderNotifItem).join('')
      : emptyState('কোনো নোটিফিকেশন নেই।', null, '🔔');
  }

  const fullNotif = document.getElementById('fullNotifList');
  if (fullNotif) {
    fullNotif.innerHTML = notifications.length
      ? notifications.map(renderNotifItem).join('')
      : emptyState('কোনো নোটিফিকেশন নেই।', null, '🔔');
  }

  const dashWish = document.getElementById('dashWishGrid');
  if (dashWish) {
    const hasWish = wishItems.length > 0;
    dashWish.classList.toggle('is-empty', !hasWish);
    dashWish.innerHTML = hasWish
      ? wishItems.slice(0, 2).map(renderWishItem).join('')
      : wishEmpty;
  }

  const fullWish = document.getElementById('fullWishGrid');
  if (fullWish) {
    fullWish.innerHTML = wishItems.length
      ? wishItems.map(renderWishItem).join('')
      : wishEmpty;
  }

  const wishTitle = document.getElementById('wishlistTitle');
  if (wishTitle) {
    wishTitle.textContent = `❤️ আমার উইশলিস্ট (${wishItems.length}টি পণ্য)`;
  }
}

function paintRewardHistory() {
  const el = document.getElementById('rewardHistory');
  if (!el) return;
  if (!orders.length) {
    el.innerHTML = emptyState('অর্ডার করলে পয়েন্ট ইতিহাস এখানে দেখাবে।');
    return;
  }
  el.innerHTML = orders
    .slice(0, 6)
    .map((o) => ({
      icon: '🛍️',
      text: `${o.name} অর্ডার`,
      pts: `+${Math.max(50, Math.floor(o.priceNum / 100))}`,
      date: o.date,
    }))
    .map(
      (r) => `<div class="notif-item">
  <div class="notif-icon blue">${r.icon}</div>
  <div style="flex:1"><div class="notif-text">${r.text}</div><div class="notif-time">${r.date}</div></div>
  <div style="font-size:14px;font-weight:700;color:var(--green)">${r.pts}</div>
</div>`
    )
    .join('');
}

function paintRewardItems() {
  const el = document.getElementById('rewardItems');
  if (!el) return;
  el.innerHTML = REWARD_REDEEM.map(
    (r) => `<div class="qa-card" role="button" tabindex="0">
  <div class="qa-icon" style="background:var(--amber-soft);font-size:24px">${r.icon}</div>
  <div style="font-size:13px;font-weight:700">${r.name}</div>
  <div style="font-size:11.5px;color:var(--amber);font-weight:600">${r.pts}</div>
</div>`
  ).join('');
  el.querySelectorAll('.qa-card').forEach((c) => {
    c.addEventListener('click', () => showToast('🎁 শীঘ্রই উপলব্ধ হবে!'));
  });
}

async function enrichWishlist() {
  let raw = [];
  try {
    raw = JSON.parse(localStorage.getItem(WISH_STORAGE) || '[]');
  } catch (_) {}
  const tasks = raw.map(async (item) => {
    if (item.name && item.price != null) return mapWishItem(item);
    if (!item.id) return null;
    try {
      const { product } = await api('/products/' + item.id);
      return mapWishItem({
        id: product.id,
        name: product.nameBn || product.name,
        icon: product.icon,
        imageUrl: product.imageUrl,
        price: product.price,
        original: product.original,
      });
    } catch (_) {
      return null;
    }
  });
  wishItems = (await Promise.all(tasks)).filter(Boolean);
}

function paintDashboardUI() {
  paintLists();
  paintRewardHistory();
  paintRewardItems();
}

async function fetchAccount() {
  if (window.__ACCOUNT__) return window.__ACCOUNT__;
  return api('/account/data');
}

async function refreshAccount() {
  window.__ACCOUNT__ = await api('/account/data');
  applyAccountData(window.__ACCOUNT__);
  paintLists();
  paintRewardHistory();
}

function showPage(name, navEl) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  document.getElementById('page-' + name)?.classList.add('active');
  document.getElementById('pageTitle').textContent = pageTitles[name] || name;

  document.querySelectorAll('.dash-mnav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === name);
  });

  if (navEl?.classList?.contains('nav-item')) {
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    navEl.classList.add('active');
  } else if (navEl?.classList?.contains('dash-mnav-item')) {
    document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach((n) => {
      if (n.getAttribute('onclick')?.includes("'" + name + "'")) {
        n.classList.add('active');
      }
    });
  } else {
    document.querySelectorAll('.nav-item').forEach((n) => {
      if (n.getAttribute('onclick')?.includes("'" + name + "'")) {
        document.querySelectorAll('.nav-item').forEach((x) => x.classList.remove('active'));
        n.classList.add('active');
      }
    });
  }
  window.scrollTo(0, 0);
}

function setOrderTab(el, filter) {
  document.querySelectorAll('#orderTabs .tab').forEach((t) => t.classList.remove('active'));
  el.classList.add('active');
  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);
  const fullOrders = document.getElementById('fullOrderList');
  if (fullOrders) {
    fullOrders.dataset.filtered = filter;
    fullOrders.innerHTML = filtered.length
      ? filtered.map(renderOrderItem).join('')
      : emptyState('এই ক্যাটাগরিতে কোনো অর্ডার নেই।');
  }
}

function resetProfileForm() {
  if (!profileSnapshot) return;
  setVal('f_first', profileSnapshot.firstName);
  setVal('f_last', profileSnapshot.lastName);
  setVal('f_phone', profileSnapshot.phone);
}

async function saveProfile() {
  const firstName = document.getElementById('f_first')?.value?.trim() || '';
  const lastName = document.getElementById('f_last')?.value?.trim() || '';
  const phone = document.getElementById('f_phone')?.value?.trim() || '';

  if (!firstName && !lastName) {
    showToast('⚠️ প্রথম নাম বা শেষ নাম লিখুন');
    document.getElementById('f_first')?.focus();
    return;
  }
  if (!phone) {
    showToast('⚠️ ফোন নম্বর লিখুন');
    document.getElementById('f_phone')?.focus();
    return;
  }

  const btn = document.getElementById('btnSaveProfile');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'সেভ হচ্ছে…';
  }

  try {
    await api('/account/profile', {
      method: 'PATCH',
      body: JSON.stringify({ firstName, lastName, phone }),
    });
    window.__ACCOUNT__ = null;
    await refreshAccount();
    showToast('✅ প্রোফাইল সফলভাবে আপডেট হয়েছে!');
  } catch (err) {
    showToast('❌ ' + (err.message || 'সেভ করা যায়নি'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 সেভ করুন';
    }
  }
}

function copyCode(code) {
  navigator.clipboard?.writeText(code).catch(() => {});
  showToast(`✅ "${code}" কপি হয়েছে! চেকআউটে ব্যবহার করুন।`);
}

function markAllRead() {
  notifications.forEach((n) => {
    n.unread = false;
  });
  document.querySelectorAll('.unread-dot').forEach((d) => d.remove());
  document.querySelectorAll('.notif-item').forEach((n) => n.classList.remove('unread'));
  document.querySelector('.tb-notif')?.remove();
  setBadge('badgeNotif', 0);
  paintLists();
  showToast('✅ সব নোটিফিকেশন পড়া হিসেবে মার্ক হয়েছে।');
}

function showToast(msg) {
  const area = document.getElementById('toastArea');
  if (!area) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = msg;
  area.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    t.style.transition = 'all 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

async function onWishCartClick(e) {
  const btn = e.target.closest('[data-wish-add]');
  if (!btn?.dataset.wishAdd) return;
  try {
    await api('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId: btn.dataset.wishAdd, quantity: 1 }),
    });
    showToast('🛒 কার্টে যোগ হয়েছে!');
  } catch (err) {
    showToast(err.message);
  }
}

function finishAccountLoading() {
  document.body.classList.remove('account-loading');
}

function bindDashboardEvents() {
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await api('/auth/logout', { method: 'POST' });
    window.location.href = '/';
  });

  document.getElementById('btnAddAddress')?.addEventListener('click', () => {
    showToast('নতুন ঠিকানা চেকআউটে যোগ করুন');
  });

  document.getElementById('fullWishGrid')?.addEventListener('click', onWishCartClick);
  document.getElementById('dashWishGrid')?.addEventListener('click', onWishCartClick);

  document.getElementById('btnSaveProfile')?.addEventListener('click', saveProfile);
  document.getElementById('btnCancelProfile')?.addEventListener('click', () => {
    resetProfileForm();
    showToast('ফর্ম পুনরায় লোড হয়েছে');
  });

  document.addEventListener('click', (e) => {
    const item = e.target.closest('.notif-item[data-notif-id]');
    if (!item) return;
    openNotifView(item.dataset.notifId);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeNotifView();
    const item = e.target.closest('.notif-item[data-notif-id]');
    if (item && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openNotifView(item.dataset.notifId);
    }
  });
}

async function init() {
  syncAccountStickyOffset();
  applyTimeGreetings();
  bindDashboardEvents();

  if (window.__ACCOUNT__?.user) {
    applyAccountData(window.__ACCOUNT__);
    paintDashboardUI();
    finishAccountLoading();
    enrichWishlist()
      .then(() => paintLists())
      .catch(() => {});
    return;
  }

  document.body.classList.add('account-loading');
  try {
    const data = await fetchAccount();
    applyAccountData(data);
    paintDashboardUI();
  } catch (err) {
    if (String(err.message).includes('লগইন')) {
      window.location.href = '/?login=1&next=/account';
      return;
    }
    showToast(err.message);
  } finally {
    finishAccountLoading();
  }

  enrichWishlist()
    .then(() => paintLists())
    .catch(() => {});
}

function syncAccountStickyOffset() {
  const topbar = document.querySelector('.topbar');
  const header = document.querySelector('header');
  const nav = document.querySelector('nav');
  const offset =
    (topbar?.offsetHeight || 0) +
    (header?.offsetHeight || 0) +
    (nav?.offsetHeight || 0) +
    8;
  document.documentElement.style.setProperty('--wn-stick-top', `${offset}px`);
}

function bindAccountStickyOffset() {
  syncAccountStickyOffset();
  window.addEventListener('resize', syncAccountStickyOffset, { passive: true });
}

function bootUserDashboard() {
  bindAccountStickyOffset();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

window.syncAccountStickyOffset = syncAccountStickyOffset;

window.refreshAccountDashboard = function refreshAccountDashboard() {
  syncAccountStickyOffset();
  if (window.__ACCOUNT__?.user) {
    applyAccountData(window.__ACCOUNT__);
    paintDashboardUI();
    finishAccountLoading();
    enrichWishlist()
      .then(() => paintLists())
      .catch(() => {});
  }
};

window.showPage = showPage;
window.setOrderTab = setOrderTab;
window.saveProfile = saveProfile;
window.resetProfileForm = resetProfileForm;
window.copyCode = copyCode;
window.markAllRead = markAllRead;
window.openNotifView = openNotifView;
window.closeNotifView = closeNotifView;
window.showToast = showToast;

bootUserDashboard();
