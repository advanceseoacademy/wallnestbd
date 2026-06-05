ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]'::jsonb;

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS size_label TEXT NOT NULL DEFAULT '';
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS unit_original_price NUMERIC(10,2);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size_label TEXT;

DROP INDEX IF EXISTS cart_items_user_product_idx;
DROP INDEX IF EXISTS cart_items_session_product_idx;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_size_idx
  ON cart_items (user_id, product_id, size_label) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_session_product_size_idx
  ON cart_items (session_id, product_id, size_label) WHERE session_id IS NOT NULL;

UPDATE products
SET sizes = jsonb_build_array(
  jsonb_build_object(
    'label', '12×18"',
    'label_bn', '১২×১৮"',
    'price', price,
    'original_price', original_price,
    'stock', GREATEST(FLOOR(stock / 3.0)::int, 1)
  ),
  jsonb_build_object(
    'label', '18×24"',
    'label_bn', '১৮×২৪"',
    'price', ROUND(price * 1.35),
    'original_price', ROUND(COALESCE(original_price, price) * 1.35),
    'stock', GREATEST(FLOOR(stock / 3.0)::int, 1)
  ),
  jsonb_build_object(
    'label', '24×36"',
    'label_bn', '২৪×৩৬"',
    'price', ROUND(price * 1.75),
    'original_price', ROUND(COALESCE(original_price, price) * 1.75),
    'stock', GREATEST(stock - 2 * GREATEST(FLOOR(stock / 3.0)::int, 1), 1)
  )
)
WHERE sizes IS NULL OR sizes = '[]'::jsonb;

UPDATE products
SET price = (sizes->0->>'price')::numeric,
    original_price = (sizes->0->>'original_price')::numeric
WHERE jsonb_array_length(sizes) > 0;
