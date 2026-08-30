require('dotenv').config();
const nodemailer = require('nodemailer');
const {
  SITE_NAME,
  buildWelcomeEmail,
  buildOrderEmail,
  buildNewOrderOwnerEmail,
} = require('./templates');

let transporter = null;

function smtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!smtpConfigured()) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

function fromAddress() {
  const email = process.env.SMTP_FROM || process.env.SMTP_USER;
  const name = process.env.SMTP_FROM_NAME || SITE_NAME;
  return `"${name}" <${email}>`;
}

function siteUrl() {
  return process.env.BASE_URL || 'http://localhost:3000';
}

async function sendEmail({ to, subject, html, text }) {
  if (!to) return { skipped: true, reason: 'no_recipient' };
  const transport = getTransporter();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping send to', to);
    return { skipped: true, reason: 'smtp_not_configured' };
  }

  const info = await transport.sendMail({
    from: fromAddress(),
    to,
    subject,
    html,
    text,
  });
  return { ok: true, messageId: info.messageId };
}

async function sendWelcomeEmail({ email, firstName, lastName, verificationUrl }) {
  const payload = buildWelcomeEmail({
    email,
    firstName,
    lastName,
    verificationUrl,
    siteUrl: siteUrl(),
  });
  return sendEmail({ to: email, ...payload });
}

async function sendOrderConfirmationEmail(order, items) {
  const to = order.customer_email;
  if (!to) return { skipped: true, reason: 'no_customer_email' };

  const payload = buildOrderEmail({
    customerName: order.shipping_name,
    orderNumber: order.order_number,
    items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    shippingAddress: order.shipping_address,
    shippingCity: order.shipping_city,
    shippingPhone: order.shipping_phone || order.payment_phone,
    siteUrl: siteUrl(),
  });
  return sendEmail({ to, ...payload });
}

/** Comma-separated list, falls back to the SMTP sender so notifications never go nowhere. */
function ownerRecipients() {
  const raw = process.env.OWNER_NOTIFY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || '';
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .join(', ');
}

async function sendNewOrderOwnerEmail(order, items) {
  const to = ownerRecipients();
  if (!to) return { skipped: true, reason: 'no_owner_email' };

  const payload = buildNewOrderOwnerEmail({
    orderNumber: order.order_number,
    items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    paymentMethod: order.payment_method,
    deliveryArea: order.delivery_area,
    customerName: order.shipping_name,
    customerPhone: order.shipping_phone || order.payment_phone,
    customerEmail: order.customer_email,
    shippingAddress: order.shipping_address,
    shippingCity: order.shipping_city,
    customerNote: order.customer_note,
    siteUrl: siteUrl(),
  });
  return sendEmail({ to, ...payload });
}

/** Fire-and-forget — never blocks API response on email failure */
function queueWelcomeEmail(data) {
  sendWelcomeEmail(data).catch((err) => {
    console.error('[email] welcome/verify failed:', err.message);
  });
}

function queueVerificationEmail(data) {
  queueWelcomeEmail(data);
}

function queueOrderConfirmationEmail(order, items) {
  sendOrderConfirmationEmail(order, items).catch((err) => {
    console.error('[email] order confirmation failed:', err.message);
  });
}

function queueNewOrderOwnerEmail(order, items) {
  sendNewOrderOwnerEmail(order, items)
    .then((result) => {
      if (result?.ok) console.log('[email] new-order alert sent for', order.order_number);
      else console.warn('[email] new-order alert skipped:', result?.reason);
    })
    .catch((err) => {
      console.error('[email] new-order alert failed:', err.message);
    });
}

module.exports = {
  smtpConfigured,
  sendEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendNewOrderOwnerEmail,
  queueWelcomeEmail,
  queueVerificationEmail,
  queueOrderConfirmationEmail,
  queueNewOrderOwnerEmail,
};
