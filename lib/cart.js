const { supabase } = require('./supabase');
const { filterByProductParam } = require('./productQuery');

function getOwner(req) {
  if (req.session?.user?.id) {
    return { user_id: req.session.user.id, session_id: null };
  }
  return { user_id: null, session_id: req.sessionID };
}

async function getCartItems(req) {
  const owner = getOwner(req);
  let query = supabase
    .from('cart_items')
    .select(
      `
      id, quantity, product_id,
      products (
        id, legacy_id, name_en, name_bn, icon, image_url, price, original_price, badge, category_id
      )
    `
    );

  if (owner.user_id) {
    query = query.eq('user_id', owner.user_id);
  } else {
    query = query.eq('session_id', owner.session_id);
  }

  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;

  return (data || []).map((row) => ({
    cartItemId: row.id,
    id: row.products?.legacy_id || row.product_id,
    productId: row.product_id,
    name: row.products?.name_en,
    nameBn: row.products?.name_bn,
    icon: row.products?.icon || '📦',
    imageUrl: row.products?.image_url || null,
    price: Number(row.products?.price || 0),
    original: Number(row.products?.original_price || 0),
    badge: row.products?.badge,
    qty: row.quantity,
  }));
}

async function addToCart(req, productId, quantity = 1) {
  const owner = getOwner(req);

  const { data: product, error: pErr } = await filterByProductParam(
    supabase.from('products').select('id'),
    productId
  ).maybeSingle();
  if (pErr) throw pErr;
  if (!product) throw new Error('Product not found');

  let existingQuery = supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('product_id', product.id);

  if (owner.user_id) {
    existingQuery = existingQuery.eq('user_id', owner.user_id);
  } else {
    existingQuery = existingQuery.eq('session_id', owner.session_id);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({
        quantity: existing.quantity + quantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('cart_items').insert({
      ...owner,
      product_id: product.id,
      quantity,
    });
    if (error) throw error;
  }
}

async function updateCartQty(req, cartItemId, delta) {
  const owner = getOwner(req);
  let query = supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('id', cartItemId);

  if (owner.user_id) query = query.eq('user_id', owner.user_id);
  else query = query.eq('session_id', owner.session_id);

  const { data: item, error } = await query.maybeSingle();
  if (error) throw error;
  if (!item) throw new Error('Cart item not found');

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    await supabase.from('cart_items').delete().eq('id', item.id);
    return;
  }

  const { error: upErr } = await supabase
    .from('cart_items')
    .update({ quantity: newQty, updated_at: new Date().toISOString() })
    .eq('id', item.id);
  if (upErr) throw upErr;
}

async function removeFromCart(req, cartItemId) {
  const owner = getOwner(req);
  let query = supabase.from('cart_items').delete().eq('id', cartItemId);
  if (owner.user_id) query = query.eq('user_id', owner.user_id);
  else query = query.eq('session_id', owner.session_id);
  const { error } = await query;
  if (error) throw error;
}

async function clearCart(req) {
  const owner = getOwner(req);
  let query = supabase.from('cart_items').delete();
  if (owner.user_id) query = query.eq('user_id', owner.user_id);
  else query = query.eq('session_id', owner.session_id);
  const { error } = await query;
  if (error) throw error;
}

module.exports = {
  getCartItems,
  addToCart,
  updateCartQty,
  removeFromCart,
  clearCart,
};
