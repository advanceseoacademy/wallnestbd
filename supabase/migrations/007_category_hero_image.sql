ALTER TABLE categories ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

UPDATE categories SET hero_image_url = '/images/hero/islamic-wall-art.jpg'
WHERE slug = 'islamic-wall-art' AND (hero_image_url IS NULL OR hero_image_url = '');

UPDATE categories SET hero_image_url = '/images/hero/family-photo-canvas.jpg'
WHERE slug = 'family-photo-canvas' AND (hero_image_url IS NULL OR hero_image_url = '');

UPDATE categories SET hero_image_url = '/images/hero/kids-room-art.jpg'
WHERE slug = 'kids-room-art' AND (hero_image_url IS NULL OR hero_image_url = '');

UPDATE categories SET hero_image_url = '/images/hero/abstract-office.jpg'
WHERE slug = 'office-motivational-art'
  AND (hero_image_url IS NULL OR hero_image_url = '');
