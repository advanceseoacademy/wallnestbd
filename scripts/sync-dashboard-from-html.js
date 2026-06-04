/**
 * Copies user-dashboard.html → views/account/dashboard.ejs + public/css/user-dashboard.css
 * Preserves markup/CSS exactly; only adds data-* / id hooks for live data.
 */
const fs = require('fs');
const path = require('path');

const src =
  process.argv[2] ||
  path.join(process.env.USERPROFILE || '', 'Downloads', 'user-dashboard.html');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(src, 'utf8');

const styleStart = html.indexOf('<style>') + 7;
const styleEnd = html.indexOf('</style>');
const css = html.slice(styleStart, styleEnd).trim();
fs.writeFileSync(path.join(root, 'public', 'css', 'user-dashboard.css'), css, 'utf8');

let body = html.slice(html.indexOf('<div class="layout">'), html.indexOf('<div class="toast-area"'));

const hooks = [
  ['<div class="user-avatar-inner">', '<div class="user-avatar-inner" id="sidebarInitials">'],
  ['<div class="user-name">', '<div class="user-name" id="sidebarName">'],
  ['<div class="user-email">', '<div class="user-email" id="sidebarEmail">'],
  ['<div class="user-tier">', '<div class="user-tier" id="sidebarTier">'],
  ['<span>রাহেলা বেগম!</span>', '<span id="welcomeNameSpan">রাহেলা বেগম!</span>'],
  [
    '<div class="welcome-sub">আপনার সর্বশেষ অর্ডার শিপমেন্টে আছে। ট্র্যাক করুন।</div>',
    '<div class="welcome-sub" id="welcomeSub">আপনার সর্বশেষ অর্ডার শিপমেন্টে আছে। ট্র্যাক করুন।</div>',
  ],
  [
    '<div class="ws-value">১২</div>\n          <div class="ws-label">মোট অর্ডার</div>',
    '<div class="ws-value" id="statOrders">১২</div>\n          <div class="ws-label">মোট অর্ডার</div>',
  ],
  [
    '<div class="ws-value">২৪০</div>\n          <div class="ws-label">পয়েন্ট অর্জিত</div>',
    '<div class="ws-value" id="statPoints">২৪০</div>\n          <div class="ws-label">পয়েন্ট অর্জিত</div>',
  ],
  [
    '<div class="ws-value">৪.৮★</div>\n          <div class="ws-label">অভিজ্ঞতা</div>',
    '<div class="ws-value" id="statRating">৪.৮★</div>\n          <div class="ws-label">অভিজ্ঞতা</div>',
  ],
  ['<div class="reward-points">২,৪০০</div>', '<div class="reward-points" id="dashRewardPoints">২,৪০০</div>'],
  [
    '<div class="reward-progress-fill"></div>',
    '<div class="reward-progress-fill" id="dashRewardFill"></div>',
  ],
  [
    '<span>২,৪০০ পয়েন্ট</span>\n            <span>গোল্ড → প্লাটিনামের জন্য ৬০০ বাকি</span>',
    '<span id="dashRewardPtsLabel">২,৪০০ পয়েন্ট</span>\n            <span id="dashRewardGoalLabel">গোল্ড → প্লাটিনামের জন্য ৬০০ বাকি</span>',
  ],
  [
    '<span style="font-size:12px;color:var(--muted)">#WM-8831</span>',
    '<span style="font-size:12px;color:var(--muted)" id="trackingOrderId">#WM-8831</span>',
  ],
  [
    '<div class="card-body">\n            <div style="font-size:13px;margin-bottom:4px;"><strong>Wireless Earbuds Pro</strong></div>\n            <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">আনুমানিক ডেলিভারি: ৩ জুন ২০২৪</div>\n            <div class="track-bar">',
    '<div class="card-body" id="trackingBody">\n            <div style="font-size:13px;margin-bottom:4px;" id="trackingProductName"><strong>Wireless Earbuds Pro</strong></div>\n            <div style="font-size:12px;color:var(--muted);margin-bottom:4px;" id="trackingDeliveryNote">আনুমানিক ডেলিভারি: ৩ জুন ২০২৪</div>\n            <div class="track-bar" id="trackingBar">',
  ],
  ['<div class="profile-avatar-inner">রা</div>', '<div class="profile-avatar-inner" id="profileInitials">রা</div>'],
  ['<h3>রাহেলা বেগম</h3>', '<h3 id="profileDisplayName">রাহেলা বেগম</h3>'],
  [
    '<p>সদস্যপদ: নভেম্বর ২০২৩ | ⭐ গোল্ড মেম্বার</p>',
    '<p id="profileMemberLine">সদস্যপদ: নভেম্বর ২০২৩ | ⭐ গোল্ড মেম্বার</p>',
  ],
  ['<button class="logout-btn">', '<button type="button" class="logout-btn" id="logoutBtn">'],
  ['<div class="address-list">', '<div class="address-list" id="addressList">'],
  ['<div class="coupon-list">', '<div class="coupon-list" id="couponList">'],
  [
    '<div class="card-title">❤️ আমার উইশলিস্ট (৬টি পণ্য)</div>',
    '<div class="card-title" id="wishlistTitle">❤️ আমার উইশলিস্ট (৬টি পণ্য)</div>',
  ],
  [
    '<div class="reward-points">২,৪০০</div>\n        <div class="reward-sub">আপনি গোল্ড মেম্বার',
    '<div class="reward-points" id="rewardsPagePoints">২,৪০০</div>\n        <div class="reward-sub" id="rewardsPageSub">আপনি গোল্ড মেম্বার',
  ],
  [
    '<div class="reward-progress-bg"><div class="reward-progress-fill"></div></div>\n        <div class="reward-progress-label"><span>২,৪০০ / ৩,০০০</span>',
    '<div class="reward-progress-bg"><div class="reward-progress-fill" id="rewardsPageFill"></div></div>\n        <div class="reward-progress-label"><span id="rewardsPagePtsLabel">২,৪০০ / ৩,০০০</span>',
  ],
];

for (const [from, to] of hooks) {
  if (body.includes(from)) body = body.replace(from, to);
}

const page = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<%- include('../partials/favicon') %>
<title>ShopMart BD — আমার অ্যাকাউন্ট</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Hind+Siliguri:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/user-dashboard.css">
</head>
<body>
${body}

<div class="toast-area" id="toastArea"></div>
<script src="/js/user-dashboard.js"></script>
</body>
</html>
`;

fs.mkdirSync(path.join(root, 'views', 'account'), { recursive: true });
fs.writeFileSync(path.join(root, 'views', 'account', 'dashboard.ejs'), page, 'utf8');
console.log('Synced CSS + dashboard.ejs from', src);
