-- Assign legacy_id to products missing one (short SKU: WN-1, WN-2, …)
WITH max_id AS (
  SELECT COALESCE(MAX(legacy_id), 0) AS base FROM products
),
numbered AS (
  SELECT
    p.id,
    max_id.base + ROW_NUMBER() OVER (ORDER BY p.created_at ASC) AS new_legacy
  FROM products p
  CROSS JOIN max_id
  WHERE p.legacy_id IS NULL
)
UPDATE products
SET legacy_id = numbered.new_legacy
FROM numbered
WHERE products.id = numbered.id;
