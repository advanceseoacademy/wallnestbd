const { supabase } = require('./supabase');
const { filterByProductParam } = require('./productQuery');
const { normalizeProductSizes, resolveSize, getMaxOrderQty } = require('./productSizes');

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
      id, quantity, product_id, size_label, unit_price, unit_original_price,
      products (
        id, legacy_id, name_en, name_bn, icon, image_url, price, original_price, badge, category_id, sizes
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

  return (data || []).map((row) => {
    const sizes = normalizeProductSizes(row.products?.sizes, row.products || {});
    const matched = resolveSize(sizes, row.size_label);
    const price = Number(row.unit_price ?? matched?.price ?? row.products?.price ?? 0);
    const original = Number(
      row.unit_original_price ?? matched?.original ?? row.products?.original_price ?? price
    );
    const sizeLabel = row.size_label || matched?.label || '';
    const name = row.products?.name_en;
    return {
      cartItemId: row.id,
      id: row.products?.legacy_id || row.product_id,
      productId: row.product_id,
      name,
      nameBn: row.products?.name_bn,
      sizeLabel,
      displayName: sizeLabel ? `${name} (${sizeLabel})` : name,
      icon: row.products?.icon || '📦',
      imageUrl: row.products?.image_url || null,
      price,
      original,
      badge: row.products?.badge,
      qty: row.quantity,
    };
  });
}

async function addToCart(req, productId, quantity = 1, sizeLabel = '') {
  const owner = getOwner(req);

  const { data: product, error: pErr } = await filterByProductParam(
    supabase.from('products').select('id, price, original_price, stock, sizes'),
    productId
  ).maybeSingle();
  if (pErr) throw pErr;
  if (!product) throw new Error('Product not found');

  const sizes = normalizeProductSizes(product.sizes, product);
  const size = resolveSize(sizes, sizeLabel);
  if (!size) throw new Error('সাইজ পাওয়া যায়নি');
  if (size.stock <= 0) throw new Error('এই সাইজে স্টক নেই');

  const maxStock = getMaxOrderQty(product);
  const label = size.label;

  let existingQuery = supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('product_id', product.id)
    .eq('size_label', label);

  if (owner.user_id) {
    existingQuery = existingQuery.eq('user_id', owner.user_id);
  } else {
    existingQuery = existingQuery.eq('session_id', owner.session_id);
  }

  const { data: existing } = await existingQuery.maybeSingle();

  const newTotal = (existing?.quantity || 0) + quantity;
  if (newTotal > maxStock) {
    throw new Error(`স্টকে মাত্র ${maxStock}টি আছে`);
  }

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({
        quantity: existing.quantity + quantity,
        unit_price: size.price,
        unit_original_price: size.original,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('cart_items').insert({
      ...owner,
      product_id: product.id,
      quantity,
      size_label: label,
      unit_price: size.price,
      unit_original_price: size.original,
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

async function validateCartStock(req) {
  const items = await getCartItems(req);
  for (const item of items) {
    const { data: product, error } = await filterByProductParam(
      supabase.from('products').select('id, stock, sizes, name_en'),
      item.productId
    ).maybeSingle();
    if (error) throw error;
    if (!product) {
      throw new Error(`${item.displayName || item.name} আর উপলব্ধ নেই`);
    }
    const sizes = normalizeProductSizes(product.sizes, product);
    const size = resolveSize(sizes, item.sizeLabel);
    if (size && size.stock <= 0) {
      const label = item.displayName || item.name;
      throw new Error(`${label}: স্টক শেষ`);
    }
    const available = getMaxOrderQty(product);
    if (available < item.qty) {
      const label = item.displayName || item.name;
      throw new Error(
        available <= 0
          ? `${label}: স্টক শেষ`
          : `${label}: স্টকে মাত্র ${available}টি আছে`
      );
    }
  }
}

module.exports = {
  getCartItems,
  addToCart,
  updateCartQty,
  removeFromCart,
  clearCart,
  validateCartStock,
};
