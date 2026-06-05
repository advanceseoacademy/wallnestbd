require('dotenv').config();
const nodemailer = require('nodemailer');
const { SITE_NAME, buildWelcomeEmail, buildOrderEmail } = require('./templates');

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

async function sendWelcomeEmail({ email, firstName, lastName }) {
  const payload = buildWelcomeEmail({
    email,
    firstName,
    lastName,
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

/** Fire-and-forget — never blocks API response on email failure */
function queueWelcomeEmail(data) {
  sendWelcomeEmail(data).catch((err) => {
    console.error('[email] welcome failed:', err.message);
  });
}

function queueOrderConfirmationEmail(order, items) {
  sendOrderConfirmationEmail(order, items).catch((err) => {
    console.error('[email] order confirmation failed:', err.message);
  });
}

module.exports = {
  smtpConfigured,
  sendEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  queueWelcomeEmail,
  queueOrderConfirmationEmail,
};
