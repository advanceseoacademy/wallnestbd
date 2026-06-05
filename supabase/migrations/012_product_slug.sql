ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE products
SET slug = trim(both '-' from regexp_replace(lower(name_en), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL OR trim(slug) = '';

UPDATE products p
SET slug = p.slug || '-' || COALESCE(p.legacy_id::text, substr(p.id::text, 1, 8))
WHERE p.id IN (
  SELECT id FROM (
    SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY legacy_id NULLS LAST, created_at) AS rn
    FROM products
    WHERE slug IS NOT NULL
  ) t
  WHERE t.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique ON products (slug) WHERE slug IS NOT NULL;
