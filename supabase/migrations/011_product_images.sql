ALTER TABLE products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

UPDATE products
SET images = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL
  AND trim(image_url) <> ''
  AND (images IS NULL OR images = '[]'::jsonb OR jsonb_array_length(images) = 0);
