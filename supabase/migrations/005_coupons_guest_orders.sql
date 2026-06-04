ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

CREATE INDEX IF NOT EXISTS orders_customer_email_idx ON orders (lower(customer_email))
  WHERE customer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_guest_phone_idx ON orders (shipping_phone)
  WHERE user_id IS NULL;

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percent'
    CHECK (discount_type IN ('percent', 'fixed', 'free_shipping')),
  discount_value NUMERIC(10,2),
  description_en TEXT,
  description_bn TEXT,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coupons_active_idx ON coupons (is_active, sort_order)
  WHERE is_active = TRUE;

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active coupons" ON coupons;
CREATE POLICY "Public read active coupons" ON coupons FOR SELECT USING (is_active = TRUE);

INSERT INTO coupons (code, discount_type, discount_value, description_en, description_bn, min_order_amount, expires_at, sort_order)
VALUES
  ('WALLNEST10', 'percent', 10, '10% off orders over 1500 BDT', '৳1500+ অর্ডারে ১০% ছাড়', 1500, '2026-12-31 23:59:59+00', 1),
  ('FIRST15', 'percent', 15, '15% off your first order', 'প্রথম অর্ডারে ১৫% ছাড়', 0, '2027-06-30 23:59:59+00', 2),
  ('FREESHIP', 'free_shipping', 0, 'Free shipping on orders over 1500 BDT', '৳1500+ অর্ডারে ফ্রি শিপিং', 1500, NULL, 3)
ON CONFLICT (code) DO NOTHING;
