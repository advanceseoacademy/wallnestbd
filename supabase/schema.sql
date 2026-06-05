-- ShopMart BD E-commerce Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_bn TEXT,
  icon TEXT DEFAULT '📦',
  sort_order INT DEFAULT 0,
  catalog_share INT DEFAULT NULL,
  hero_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id INT UNIQUE,
  slug TEXT UNIQUE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name_en TEXT NOT NULL,
  name_bn TEXT,
  description TEXT,
  icon TEXT DEFAULT '📦',
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  sizes JSONB DEFAULT '[]'::jsonb,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  rating NUMERIC(2,1) DEFAULT 4.5,
  review_count INT DEFAULT 0,
  badge TEXT CHECK (badge IN ('sale', 'new', 'hot') OR badge IS NULL),
  is_featured BOOLEAN DEFAULT TRUE,
  is_flash_sale BOOLEAN DEFAULT FALSE,
  stock INT DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_label TEXT NOT NULL DEFAULT '',
  unit_price NUMERIC(10,2),
  unit_original_price NUMERIC(10,2),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT cart_owner_check CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_user_product_size_idx
  ON cart_items (user_id, product_id, size_label) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_session_product_size_idx
  ON cart_items (session_id, product_id, size_label) WHERE session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_name TEXT NOT NULL,
  shipping_phone TEXT,
  shipping_address TEXT NOT NULL,
  shipping_city TEXT,
  shipping_zip TEXT,
  customer_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_icon TEXT,
  size_label TEXT,
  price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  line_total NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_featured_idx ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS products_flash_idx ON products(is_flash_sale) WHERE is_flash_sale = TRUE;
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS cart_items_session_idx ON cart_items(session_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON categories;
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reviews" ON reviews;
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active coupons" ON coupons;
CREATE POLICY "Public read active coupons" ON coupons FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Anyone can subscribe newsletter" ON newsletter_subscribers;
CREATE POLICY "Anyone can subscribe newsletter" ON newsletter_subscribers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read own session cart" ON cart_items;
CREATE POLICY "Public read own session cart" ON cart_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert cart" ON cart_items;
CREATE POLICY "Public insert cart" ON cart_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update cart" ON cart_items;
CREATE POLICY "Public update cart" ON cart_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public delete cart" ON cart_items;
CREATE POLICY "Public delete cart" ON cart_items FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public insert orders" ON orders;
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read orders" ON orders;
CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert order items" ON order_items;
CREATE POLICY "Public insert order items" ON order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read order items" ON order_items;
CREATE POLICY "Public read order items" ON order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own profile" ON profiles;
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id);
