const fs = require('fs');
const path = require('path');

const src = process.argv[2] || path.join(process.env.USERPROFILE || '', 'Downloads', 'user-dashboard.html');
const html = fs.readFileSync(src, 'utf8');

let body = html.slice(html.indexOf('<div class="layout">'), html.indexOf('<div class="toast-area"'));

body = body
  .replace(
    /<div class="brand-logo">[^<]*<\/div>/,
    '<a href="/" class="brand-logo"><img src="/images/wallnestbd-logo.png?v=4" alt="WallNest BD" style="height:36px;width:auto;border-radius:3px;display:block"></a>'
  )
  .replace(
    'ShopMart BD <small>Walmart Seller Store</small>',
    'WallNest BD <small>Beautiful Walls, Better Living</small>'
  )
  .replace(
    /<div class="user-avatar-inner">[^<]*<\/div>/,
    '<div class="user-avatar-inner" id="sidebarInitials">—</div>'
  )
  .replace(/<div class="user-name">[^<]*<\/div>/, '<div class="user-name" id="sidebarName">—</div>')
  .replace(/<div class="user-email">[^<]*<\/div>/, '<div class="user-email" id="sidebarEmail">—</div>')
  .replace(/<div class="user-tier">[^<]*<\/div>/, '<div class="user-tier" id="sidebarTier">⭐ সদস্য</div>')
  .replace(
    /<span class="nav-badge">[\s\S]*?<\/span>\s*<\/div>\s*<div class="nav-item" onclick="showPage\('wishlist'/,
    '</div>\n    <div class="nav-item" onclick="showPage(\'wishlist\''
  )
  .replace(/<span class="nav-badge amber">[^<]*<\/span>/, '<span class="nav-badge amber" id="couponBadge"></span>')
  .replace(
    /<div class="nav-item" onclick="showPage\('notifications'[\s\S]*?<span class="nav-badge">[^<]*<\/span>/,
    `<div class="nav-item" onclick="showPage('notifications',this)">
      <span class="nav-icon">🔔</span> নোটিফিকেশন
      <span class="nav-badge" id="notifBadge"></span>`
  )
  .replace('<button class="logout-btn">', '<button type="button" class="logout-btn" id="logoutBtn">')
  .replace('<div class="tb-btn">🛒</div>', '<a class="tb-btn" href="/" title="শপিং">🛒</a>')
  .replace(
    /নমস্কার, <span>[^<]*<\/span>/,
    '<span id="welcomeGreeting">Good morning</span>, <span id="welcomeNameSpan">গ্রাহক</span>'
  )
  .replace(/<div class="welcome-sub">[^<]*<\/div>/, '<div class="welcome-sub" id="welcomeSub">WallNest BD-তে স্বাগতম।</div>')
  .replace(
    /<div class="welcome-right">[\s\S]*?<\/div>\s*<\/div>\s*<!-- QUICK/,
    `<div class="welcome-right">
        <div class="welcome-stat"><div class="ws-value" id="statOrders">0</div><div class="ws-label">মোট অর্ডার</div></div>
        <div class="welcome-stat"><div class="ws-value" id="statPoints">0</div><div class="ws-label">পয়েন্ট অর্জিত</div></div>
        <div class="welcome-stat"><div class="ws-value" id="statActive">0</div><div class="ws-label">সক্রিয় অর্ডার</div></div>
      </div>
    </div>

    <!-- QUICK`
  )
  .replace(
    /<div class="reward-points">[^<]*<\/div>/g,
    '<div class="reward-points" data-reward-points>0</div>'
  )
  .replace(
    /<div class="reward-progress-fill"><\/div>/g,
    '<div class="reward-progress-fill" data-reward-fill style="width:0%"></div>'
  )
  .replace(
    /<div class="card">\s*<div class="card-header">\s*<div class="card-title">🚚 লাইভ ট্র্যাকিং<\/div>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    `<div class="card" id="trackingCard" style="display:none">
          <div class="card-header">
            <div class="card-title">🚚 লাইভ ট্র্যাকিং</div>
            <span style="font-size:12px;color:var(--muted)" id="trackingOrderId"></span>
          </div>
          <div class="card-body" id="trackingBody"></div>
        </div>`
  )
  .replace(
    /<div class="address-list">[\s\S]*?<button class="btn-add"[^>]*>[^<]*<\/button>/,
    `<div class="address-list" id="addressList"></div>
          <button type="button" class="btn-add" onclick="showToast('নতুন ঠিকানা চেকআউটে যোগ করুন')">➕ নতুন ঠিকানা যোগ করুন</button>`
  )
  .replace(/<div class="coupon-list">[\s\S]*?(?=<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<!-- ════════ PROFILE)/, '<div class="coupon-list" id="couponList"></div>\n        ')
  .replace(
    /<div class="profile-header">[\s\S]*?<\/div>\s*<div class="card-body">\s*<div class="form-grid" id="profileForm">[\s\S]*?<\/div>\s*<div style="margin-top:20px/,
    `<div class="profile-header">
        <div class="profile-avatar-lg"><div class="profile-avatar-inner" id="profileInitials">—</div></div>
        <div class="profile-info"><h3 id="profileDisplayName">—</h3><p id="profileMemberLine">—</p></div>
        <button type="button" class="profile-edit-btn" onclick="toggleEdit()">✏️ এডিট করুন</button>
      </div>
      <div class="card-body">
        <div class="form-grid" id="profileForm">
          <div class="form-group"><label class="form-label">প্রথম নাম</label><input class="form-input" id="f_first" readonly></div>
          <div class="form-group"><label class="form-label">শেষ নাম</label><input class="form-input" id="f_last" readonly></div>
          <div class="form-group"><label class="form-label">ইমেইল</label><input class="form-input" id="f_email" readonly></div>
          <div class="form-group"><label class="form-label">ফোন নম্বর</label><input class="form-input" id="f_phone" readonly></div>
          <div class="form-group full"><label class="form-label">বর্তমান ঠিকানা</label><input class="form-input" id="f_addr" readonly></div>
        </div>
        <div style="margin-top:20px;display:none;gap:10px;" id="profileBtns"`
  )
  .replace(
    /<div class="card-title">❤️ আমার উইশলিস্ট[^<]*<\/div>/,
    '<div class="card-title" id="wishlistTitle">❤️ আমার উইশলিস্ট</div>'
  );

const out = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<%- include('../partials/favicon') %>
<title>আমার অ্যাকাউন্ট — WallNest BD</title>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/user-dashboard.css">
</head>
<body>
${body}

<div class="toast-area" id="toastArea"></div>
<script src="/js/user-dashboard.js"></script>
</body>
</html>
`;

const dest = path.join(__dirname, '..', 'views', 'account', 'dashboard.ejs');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out, 'utf8');
console.log('Wrote', dest);
