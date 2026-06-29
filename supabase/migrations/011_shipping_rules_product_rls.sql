-- Shipping rules for storefront + tighten product RLS (admin uses service role).

INSERT INTO site_settings (key, value) VALUES
  ('shipping_rules', '{"free_shipping_min": 1500, "shipping_fee": 80}'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Manage products" ON products;

-- Public storefront: read-only product access for anon/authenticated clients.
DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
