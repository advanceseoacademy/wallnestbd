const { supabase } = require('./supabase');

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 11 && digits.startsWith('880')) return digits.slice(-11);
  if (digits.length >= 10) return digits.slice(-11);
  return digits;
}

function phonesMatch(a, b) {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb || na.endsWith(nb.slice(-10)) || nb.endsWith(na.slice(-10));
}

async function linkGuestOrders(user, options = {}) {
  const { sessionId } = options;
  let profilePhone = options.profilePhone;
  if (!profilePhone && user.id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle();
    profilePhone = prof?.phone;
  }
  const email = user.email?.trim().toLowerCase();
  const linked = [];

  if (sessionId) {
    const { data: bySession, error: e1 } = await supabase
      .from('orders')
      .update({ user_id: user.id })
      .is('user_id', null)
      .eq('session_id', sessionId)
      .select('id');
    if (e1) throw e1;
    if (bySession?.length) linked.push(...bySession.map((o) => o.id));
  }

  const orParts = [];
  if (email) orParts.push(`customer_email.eq.${email}`);
  if (profilePhone) {
    const raw = String(profilePhone).trim();
    const norm = normalizePhone(profilePhone);
    orParts.push(`shipping_phone.eq.${raw}`, `payment_phone.eq.${raw}`);
    if (norm && norm !== raw) {
      orParts.push(`shipping_phone.eq.${norm}`, `payment_phone.eq.${norm}`);
    }
    const last10 = norm.slice(-10);
    if (last10.length >= 10) {
      orParts.push(`shipping_phone.ilike.%${last10}`, `payment_phone.ilike.%${last10}`);
    }
  }

  if (orParts.length) {
    const { data: guests, error: e2 } = await supabase
      .from('orders')
      .select('id, customer_email, shipping_phone, payment_phone')
      .is('user_id', null)
      .or(orParts.join(','));
    if (e2) throw e2;

    const toLink = (guests || []).filter((o) => {
      if (linked.includes(o.id)) return false;
      if (email && o.customer_email?.trim().toLowerCase() === email) return true;
      if (profilePhone && phonesMatch(profilePhone, o.shipping_phone)) return true;
      if (profilePhone && phonesMatch(profilePhone, o.payment_phone)) return true;
      return false;
    });

    if (toLink.length) {
      const ids = toLink.map((o) => o.id);
      const { error: e3 } = await supabase
        .from('orders')
        .update({ user_id: user.id })
        .in('id', ids);
      if (e3) throw e3;
      linked.push(...ids);
    }
  }

  return linked;
}

module.exports = { linkGuestOrders, normalizePhone, phonesMatch };
