const SITE_NAME = 'WallnestBD';
const PRIMARY = '#0071CE';
const ACCENT = '#FFC220';
const TEXT = '#1A1A2E';
const MUTED = '#6B7280';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(n) {
  return `৳${Number(n || 0).toLocaleString('en-BD')}`;
}

function paymentLabel(method) {
  const map = { bkash: 'bKash', rocket: 'Rocket', nagad: 'Nagad' };
  return map[method] || method || '—';
}

function baseLayout({ title, preheader, bodyHtml, siteUrl }) {
  const year = new Date().getFullYear();
  const home = siteUrl || 'https://wallnestbd.com';
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:${TEXT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:linear-gradient(135deg,${PRIMARY} 0%,#004F93 100%);border-radius:14px 14px 0 0;padding:28px 32px;text-align:center;">
              <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">🖼️ ${SITE_NAME}</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.85);margin-top:6px;">ওয়াল আর্ট ও ক্যানভাস — বাংলাদেশে ডেলিভারি</div>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:36px 32px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#F9FAFB;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 14px 14px;padding:24px 32px;text-align:center;">
              <p style="margin:0 0 10px;font-size:13px;color:${MUTED};">
                প্রশ্ন থাকলে রিপ্লাই করুন বা <a href="${home}" style="color:${PRIMARY};text-decoration:none;font-weight:600;">${home.replace(/^https?:\/\//, '')}</a> ভিজিট করুন।
              </p>
              <p style="margin:0;font-size:12px;color:#9CA3AF;">© ${year} ${SITE_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
    <tr>
      <td style="border-radius:8px;background:${ACCENT};">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:${TEXT};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

function buildWelcomeEmail({ firstName, lastName, email, siteUrl, verificationUrl }) {
  const name = [firstName, lastName].filter(Boolean).join(' ') || email?.split('@')[0] || 'গ্রাহক';
  const home = siteUrl || process.env.BASE_URL || 'http://localhost:3000';
  const accountUrl = `${home}/account`;
  const needsVerify = Boolean(verificationUrl);

  const bodyHtml = `
    <div style="text-align:center;margin-bottom:8px;">
      <span style="display:inline-block;background:#DBEAFE;color:${PRIMARY};font-size:12px;font-weight:700;padding:6px 14px;border-radius:20px;">${needsVerify ? 'ইমেইল যাচাই / Verify Email' : 'স্বাগতম / Welcome'}</span>
    </div>
    <h1 style="margin:16px 0 12px;font-size:24px;font-weight:800;color:${TEXT};text-align:center;line-height:1.35;">
      ${escapeHtml(name)}, ${SITE_NAME}-এ আপনাকে স্বাগতম! 🎉
    </h1>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${MUTED};text-align:center;">
      ${needsVerify
        ? 'আপনার অ্যাকাউন্ট তৈরি হয়েছে। নিচের বাটনে ক্লিক করে ইমেইল যাচাই করুন — তারপর লগইন করতে পারবেন।'
        : 'আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে। এখন থেকে ইসলামিক আর্ট, ফ্যামিলি ফটো ক্যানভাস ও আরও অনেক কিছু সহজেই অর্ডার করতে পারবেন।'}
    </p>
    ${needsVerify ? `${ctaButton(verificationUrl, '✅ ইমেইল যাচাই করুন')}
    <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${MUTED};text-align:center;">
      লিংক কাজ না করলে ব্রাউজারে কপি-পেস্ট করুন:<br>
      <span style="word-break:break-all;color:${PRIMARY};">${escapeHtml(verificationUrl)}</span>
    </p>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:10px;margin:24px 0;">
      <tr>
        <td style="padding:18px 20px;">
          <div style="font-size:12px;color:${MUTED};margin-bottom:4px;">আপনার অ্যাকাউন্ট</div>
          <div style="font-size:15px;font-weight:600;color:${TEXT};">${escapeHtml(email)}</div>
        </td>
      </tr>
    </table>
    <ul style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.9;color:${MUTED};">
      <li>অর্ডার হিস্ট্রি ও ট্র্যাকিং এক জায়গায়</li>
      <li>বিকাশ / নগদ / রকেটে সহজ পেমেন্ট</li>
      <li>বাংলাদেশ জুড়ে ডেলিভারি</li>
    </ul>
    ${ctaButton(accountUrl, '🛍️ আমার অ্যাকাউন্ট দেখুন')}
    ${ctaButton(home, '🏠 শপিং শুরু করুন')}
  `;

  return {
    subject: needsVerify
      ? `✅ ${SITE_NAME} — ইমেইল যাচাই করুন, ${name}`
      : `🎉 ${SITE_NAME}-এ স্বাগতম, ${name}!`,
    html: baseLayout({
      title: needsVerify ? `Verify your ${SITE_NAME} email` : `Welcome to ${SITE_NAME}`,
      preheader: needsVerify
        ? `${SITE_NAME} অ্যাকাউন্ট সক্রিয় করতে ইমেইল যাচাই করুন।`
        : `আপনার ${SITE_NAME} অ্যাকাউন্ট তৈরি হয়েছে।`,
      bodyHtml,
      siteUrl: home,
    }),
    text: needsVerify
      ? `স্বাগতম ${name}!\n\n${SITE_NAME} অ্যাকাউন্ট যাচাই করুন:\n${verificationUrl}\n\nলগইন: ${accountUrl}`
      : `স্বাগতম ${name}!\n\nআপনার ${SITE_NAME} অ্যাকাউন্ট তৈরি হয়েছে (${email}).\n\nঅ্যাকাউন্ট: ${accountUrl}\nশপ: ${home}`,
  };
}

function buildOrderEmail({
  customerName,
  orderNumber,
  items,
  subtotal,
  shipping,
  total,
  paymentMethod,
  paymentStatus,
  shippingAddress,
  shippingCity,
  shippingPhone,
  siteUrl,
}) {
  const home = siteUrl || process.env.BASE_URL || 'http://localhost:3000';
  const trackUrl = `${home}/track-order?order=${encodeURIComponent(orderNumber)}`;
  const address = [shippingAddress, shippingCity].filter(Boolean).join(', ');

  const itemRows = (items || [])
    .map(
      (item) => `<tr>
        <td style="padding:12px 10px;border-bottom:1px solid #F3F4F6;font-size:14px;">
          <strong>${escapeHtml(item.product_name || item.name)}</strong>
          ${item.size_label ? `<br><span style="font-size:12px;color:${MUTED};">সাইজ: ${escapeHtml(item.size_label)}</span>` : ''}
        </td>
        <td style="padding:12px 10px;border-bottom:1px solid #F3F4F6;font-size:14px;text-align:center;">${item.quantity || item.qty || 1}</td>
        <td style="padding:12px 10px;border-bottom:1px solid #F3F4F6;font-size:14px;text-align:right;font-weight:600;">${formatMoney(item.line_total ?? (item.price * (item.quantity || item.qty || 1)))}</td>
      </tr>`
    )
    .join('');

  const bodyHtml = `
    <div style="text-align:center;margin-bottom:8px;">
      <span style="display:inline-block;background:#D1FAE5;color:#047857;font-size:12px;font-weight:700;padding:6px 14px;border-radius:20px;">অর্ডার নিশ্চিত / Order Received</span>
    </div>
    <h1 style="margin:16px 0 8px;font-size:22px;font-weight:800;color:${TEXT};text-align:center;">
      ধন্যবাদ, ${escapeHtml(customerName || 'গ্রাহক')}! 📦
    </h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:${MUTED};text-align:center;">
      আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে। পেমেন্ট যাচাইয়ের পর অর্ডার প্রসেস করা হবে।
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#EFF6FF,#F0FDF4);border:1px solid #BFDBFE;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 22px;text-align:center;">
          <div style="font-size:12px;color:${MUTED};margin-bottom:6px;">অর্ডার নম্বর</div>
          <div style="font-size:22px;font-weight:800;color:${PRIMARY};letter-spacing:0.5px;">${escapeHtml(orderNumber)}</div>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td width="50%" style="padding:8px;vertical-align:top;">
          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;">
            <div style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;">ডেলিভারি ঠিকানা</div>
            <div style="font-size:14px;font-weight:600;margin-top:6px;line-height:1.5;">${escapeHtml(address || '—')}</div>
            ${shippingPhone ? `<div style="font-size:13px;color:${MUTED};margin-top:6px;">📞 ${escapeHtml(shippingPhone)}</div>` : ''}
          </div>
        </td>
        <td width="50%" style="padding:8px;vertical-align:top;">
          <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;">
            <div style="font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:0.5px;">পেমেন্ট</div>
            <div style="font-size:14px;font-weight:600;margin-top:6px;">${escapeHtml(paymentLabel(paymentMethod))}</div>
            <div style="font-size:13px;color:${MUTED};margin-top:6px;">স্ট্যাটাস: পেমেন্ট যাচাই হচ্ছে</div>
          </div>
        </td>
      </tr>
    </table>
    <h2 style="font-size:16px;font-weight:700;margin:0 0 12px;color:${TEXT};">অর্ডার বিবরণ</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;">
      <tr style="background:#F9FAFB;">
        <th style="padding:12px 10px;text-align:left;font-size:12px;color:${MUTED};">পণ্য</th>
        <th style="padding:12px 10px;text-align:center;font-size:12px;color:${MUTED};">পরিমাণ</th>
        <th style="padding:12px 10px;text-align:right;font-size:12px;color:${MUTED};">মূল্য</th>
      </tr>
      ${itemRows}
      <tr>
        <td colspan="2" style="padding:12px 10px;font-size:14px;color:${MUTED};text-align:right;">সাবটোটাল</td>
        <td style="padding:12px 10px;font-size:14px;text-align:right;">${formatMoney(subtotal)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:12px 10px;font-size:14px;color:${MUTED};text-align:right;">ডেলিভারি চার্জ</td>
        <td style="padding:12px 10px;font-size:14px;text-align:right;">${shipping > 0 ? formatMoney(shipping) : 'ফ্রি'}</td>
      </tr>
      <tr style="background:#EFF6FF;">
        <td colspan="2" style="padding:14px 10px;font-size:15px;font-weight:700;text-align:right;">মোট</td>
        <td style="padding:14px 10px;font-size:18px;font-weight:800;color:${PRIMARY};text-align:right;">${formatMoney(total)}</td>
      </tr>
    </table>
    ${ctaButton(trackUrl, '📦 অর্ডার ট্র্যাক করুন')}
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${MUTED};text-align:center;">
      পেমেন্ট যাচাই হলে আমরা আপনাকে জানাবো। কোনো প্রশ্ন থাকলে অর্ডার নম্বরসহ ইমেইলে রিপ্লাই করুন।
    </p>
  `;

  return {
    subject: `📦 ${SITE_NAME} অর্ডার নিশ্চিত — ${orderNumber}`,
    html: baseLayout({
      title: `Order ${orderNumber}`,
      preheader: `আপনার অর্ডার ${orderNumber} গ্রহণ করা হয়েছে। মোট ${formatMoney(total)}`,
      bodyHtml,
      siteUrl: home,
    }),
    text: `অর্ডার নিশ্চিত\n\nঅর্ডার: ${orderNumber}\nমোট: ${formatMoney(total)}\nট্র্যাক: ${trackUrl}`,
  };
}

module.exports = {
  SITE_NAME,
  buildWelcomeEmail,
  buildOrderEmail,
};
