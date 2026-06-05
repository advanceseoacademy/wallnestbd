-- WallNest BD — Wall Art catalog seed

-- Clear demo products (keeps orders structure; removes old generic shop items)
DELETE FROM reviews;
DELETE FROM order_items;
DELETE FROM cart_items;
DELETE FROM products;

DELETE FROM categories WHERE slug IN (
  'electronics', 'fashion', 'home', 'beauty', 'toys',
  'sports', 'grocery', 'pets', 'tools'
);

DELETE FROM categories WHERE slug NOT IN (
  'all',
  'islamic-wall-art',
  'family-photo-canvas',
  'kids-room-art',
  'office-motivational-art'
);

INSERT INTO categories (slug, name_en, name_bn, icon, sort_order, catalog_share) VALUES
  ('all', 'All', 'সব', '🌟', 0, NULL),
  ('islamic-wall-art', 'Islamic Wall Art', 'ইসলামিক ওয়াল আর্ট', '🕌', 1, 40),
  ('family-photo-canvas', 'Family Photo Canvas', 'ফ্যামিলি ফটো ক্যানভাস', '🖼️', 2, 25),
  ('kids-room-art', 'Kids Room Art', 'কিডস রুম আর্ট', '🧸', 3, 15),
  ('office-motivational-art', 'Office Motivational Art', 'অফিস মোটিভেশনাল আর্ট', '💼', 4, 20)
ON CONFLICT (slug) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_bn = EXCLUDED.name_bn,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  catalog_share = EXCLUDED.catalog_share;

-- Islamic Wall Art — 40% (8 products)
INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 1, id, 'Ayatul Kursi Canvas Print', 'আয়াতুল কুরসি ক্যানভাস', 'Premium matte canvas, ready to hang. Sizes: 12x18, 18x24, 24x36 inch.', '🕌', 1299, 1899, 4.9, 420, 'hot', true, true, 50 FROM categories WHERE slug = 'islamic-wall-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id, price = EXCLUDED.price, is_flash_sale = EXCLUDED.is_flash_sale;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 2, id, 'Bismillah Metal Wall Art', 'বিসমিল্লাহ মেটাল ওয়াল আর্ট', 'Laser-cut metal finish. Living room & prayer space decor.', '✨', 1599, 2199, 4.8, 310, 'sale', true, true, 40 FROM categories WHERE slug = 'islamic-wall-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id, price = EXCLUDED.price;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 3, id, 'Kaaba Night Sky Canvas', 'কাবা নাইট স্কাই ক্যানভাস', 'High-resolution print with deep blue tones. Wooden frame optional.', '🌙', 1499, 1999, 4.7, 280, NULL, true, false, 35 FROM categories WHERE slug = 'islamic-wall-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 4, id, 'Islamic Calligraphy Triptych', 'ইসলামিক ক্যালিগ্রাফি ট্রিপটিচ', 'Three-panel set for wide walls. UV-resistant ink.', '📜', 2499, 3299, 4.9, 190, 'hot', true, false, 25 FROM categories WHERE slug = 'islamic-wall-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 5, id, 'Mosque Silhouette LED Canvas', 'মসজিদ সিলুয়েট LED ক্যানভাস', 'Soft backlight canvas — plug-in LED strip included.', '🕌', 2999, 3999, 4.8, 156, 'new', true, false, 20 FROM categories WHERE slug = 'islamic-wall-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 6, id, 'Allah Muhammad Names Acrylic', 'আল্লাহ মুহাম্মদ নাম অ্যাক্রিলিক', '3D acrylic wall letters with mounting kit.', '💫', 899, 1299, 4.6, 520, 'sale', true, false, 60 FROM categories WHERE slug = 'islamic-wall-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 7, id, 'Ramadan Lantern Wall Set', 'রমজান ল্যান্টার্ন ওয়াল সেট', 'Set of 3 lantern prints — seasonal bestseller.', '🏮', 1199, 1599, 4.7, 340, NULL, true, false, 45 FROM categories WHERE slug = 'islamic-wall-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 8, id, 'Prophetic Quote Framed Print', 'নববীয় উক্তি ফ্রেমড প্রিন্ট', 'Framed paper print with glass cover. Gift-ready box.', '📖', 999, 1399, 4.8, 410, NULL, true, false, 55 FROM categories WHERE slug = 'islamic-wall-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

-- Family Photo Canvas — 25% (5 products)
INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 9, id, 'Custom Family Photo Canvas 24x36', 'কাস্টম ফ্যামিলি ফটো ক্যানভাস ২৪x৩৬', 'Upload your photo — we print & ship in 3-5 days. HD color correction.', '🖼️', 1999, 2799, 4.9, 890, 'hot', true, true, 100 FROM categories WHERE slug = 'family-photo-canvas'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id, is_flash_sale = EXCLUDED.is_flash_sale;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 10, id, 'Wedding Couple Portrait Canvas', 'বিয়ের কাপল পোর্ট্রেট ক্যানভাস', 'Romantic layout templates. Optional names & date text.', '💑', 2299, 2999, 4.8, 560, 'sale', true, true, 80 FROM categories WHERE slug = 'family-photo-canvas'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 11, id, 'Grandparents Memorial Collage', 'গ্র্যান্ডপ্যারেন্টস মেমোরিয়াল কোলাজ', 'Multi-photo collage up to 6 images. Soft vintage filter.', '🤍', 2499, 3199, 4.9, 220, NULL, true, false, 40 FROM categories WHERE slug = 'family-photo-canvas'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 12, id, 'New Baby Footprint Canvas', 'নিউ বেবি ফুটপ্রিন্ট ক্যানভাস', 'Add baby name & birth date. Nursery-ready pastel themes.', '👶', 1799, 2399, 4.7, 380, 'new', true, false, 70 FROM categories WHERE slug = 'family-photo-canvas'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 13, id, 'Anniversary Photo Split Panel', 'বার্ষিকী ফটো স্প্লিট প্যানেল', 'Two or three panel split for panoramic family shots.', '❤️', 2699, 3499, 4.8, 195, NULL, true, false, 35 FROM categories WHERE slug = 'family-photo-canvas'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

-- Kids Room Art — 15% (3 products)
INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 14, id, 'Rainbow Unicorn Kids Canvas', 'রেইনবো ইউনিকর্ন কিডস ক্যানভাস', 'Bright, child-safe inks. Perfect for girls room.', '🦄', 899, 1299, 4.7, 610, 'hot', true, false, 90 FROM categories WHERE slug = 'kids-room-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 15, id, 'Dinosaur Adventure Wall Art', 'ডাইনোসর অ্যাডভেঞ্চার ওয়াল আর্ট', 'Jurassic theme set — canvas or poster options.', '🦕', 799, 1199, 4.6, 480, 'sale', true, false, 85 FROM categories WHERE slug = 'kids-room-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 16, id, 'Princess Castle Name Art', 'প্রিন্সেস ক্যাসল নেম আর্ট', 'Personalized with child name — choose from 8 themes.', '👑', 1099, 1499, 4.8, 350, 'new', true, false, 75 FROM categories WHERE slug = 'kids-room-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

-- Office Motivational Art — 10% (2 products)
INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 17, id, 'Success Mindset Motivational Poster', 'সাকসেস মাইন্ডসেট মোটিভেশনাল পোস্টার', 'Bold typography for office & study room. A3 & A2 sizes.', '💼', 599, 899, 4.5, 290, NULL, true, false, 120 FROM categories WHERE slug = 'office-motivational-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

INSERT INTO products (legacy_id, category_id, name_en, name_bn, description, icon, price, original_price, rating, review_count, badge, is_featured, is_flash_sale, stock)
SELECT 18, id, 'Teamwork Goals Office Canvas', 'টিমওয়ার্ক গোলস অফিস ক্যানভাস', 'Corporate gift friendly. Neutral colors for any workspace.', '🎯', 1299, 1699, 4.6, 175, NULL, true, false, 50 FROM categories WHERE slug = 'office-motivational-art'
ON CONFLICT (legacy_id) DO UPDATE SET name_en = EXCLUDED.name_en, category_id = EXCLUDED.category_id;

DELETE FROM products WHERE legacy_id IN (19, 20);

-- Reviews: apply migrations/009_product_reviews.sql after seed (30 product-linked reviews)
