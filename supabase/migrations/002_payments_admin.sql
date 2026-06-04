CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT
  CHECK (payment_method IN ('bkash', 'rocket', 'nagad') OR payment_method IS NULL);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (payment_status IN ('pending', 'submitted', 'verified', 'rejected'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'BDT';

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site settings" ON site_settings;
CREATE POLICY "Public read site settings" ON site_settings FOR SELECT USING (true);

INSERT INTO site_settings (key, value) VALUES
  ('payment_methods', '{
    "bkash": {"enabled": true, "label": "bKash", "account_type": "Personal", "number": "01XXXXXXXXX", "instructions": "Send Money করুন, তারপর Transaction ID দিন"},
    "rocket": {"enabled": true, "label": "Rocket", "account_type": "Personal", "number": "01XXXXXXXXX", "instructions": "Rocket Transfer করুন"},
    "nagad": {"enabled": true, "label": "Nagad", "account_type": "Personal", "number": "01XXXXXXXXX", "instructions": "Nagad Send Money করুন"}
  }'::jsonb),
  ('brand', '{"name": "WallNest BD", "tagline": "Your Trusted Online Store", "support_phone": "01XXXXXXXXX", "support_email": "support@wallnestbd.com"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Manage products" ON products;
CREATE POLICY "Manage products" ON products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Update orders" ON orders;
CREATE POLICY "Update orders" ON orders FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Manage site settings" ON site_settings;
CREATE POLICY "Manage site settings" ON site_settings FOR ALL USING (true) WITH CHECK (true);
