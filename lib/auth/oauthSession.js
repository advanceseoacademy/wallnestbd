const { supabase } = require('../supabase');
const { linkGuestOrders } = require('../orderLinking');

async function upsertOAuthProfile(user) {
  const meta = user.user_metadata || {};
  const fullName = (meta.full_name || meta.name || '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = meta.given_name || meta.first_name || parts[0] || null;
  const lastName =
    meta.family_name || meta.last_name || parts.slice(1).join(' ') || null;

  const row = {
    id: user.id,
    first_name: firstName,
    last_name: lastName,
  };

  try {
    const { getSupabaseAdmin } = require('../supabaseAdmin');
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('profiles').upsert(row);
    if (!error) return;
    console.error('profiles upsert (admin):', error.message);
  } catch (_) {
    /* service role optional */
  }

  const { error } = await supabase.from('profiles').upsert(row);
  if (error) console.error('profiles upsert:', error.message);
}

async function establishUserSessionFromToken(req, accessToken) {
  if (!accessToken) {
    throw new Error('Access token required');
  }
  if (!supabase) {
    throw new Error('Supabase server client is not configured');
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) throw error;
  const user = data?.user;
  if (!user?.id || !user.email) {
    throw new Error('Invalid Google sign-in session');
  }

  await upsertOAuthProfile(user);

  req.session.user = { id: user.id, email: user.email };

  let linked = [];
  try {
    linked = await linkGuestOrders(req.session.user, {
      sessionId: req.sessionID,
    });
  } catch (linkErr) {
    console.error('linkGuestOrders:', linkErr.message);
  }

  await req.session.save();

  return {
    user: req.session.user,
    linkedOrders: linked.length,
  };
}

module.exports = {
  establishUserSessionFromToken,
  upsertOAuthProfile,
};
