-- Delivery area on orders + inside/outside Dhaka shipping fees
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_area TEXT;

UPDATE site_settings
SET value = COALESCE(value, '{}'::jsonb) || jsonb_build_object(
  'inside_dhaka_fee', COALESCE((value->>'inside_dhaka_fee')::int, (value->>'shipping_fee')::int, 60),
  'outside_dhaka_fee', COALESCE((value->>'outside_dhaka_fee')::int, (value->>'shipping_fee')::int, 120)
),
updated_at = NOW()
WHERE key = 'shipping_rules';

INSERT INTO site_settings (key, value)
SELECT 'shipping_rules', '{"free_shipping_min": 1500, "shipping_fee": 80, "inside_dhaka_fee": 60, "outside_dhaka_fee": 120}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE key = 'shipping_rules');
