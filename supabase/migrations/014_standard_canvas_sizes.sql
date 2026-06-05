-- Standard canvas sizes: 6×8", 8×10", 10×12", 12×16"
UPDATE products
SET sizes = jsonb_build_array(
  jsonb_build_object(
    'label', '6×8"',
    'label_bn', '৬×৮"',
    'price', base.base_price,
    'original_price', base.base_original,
    'stock', GREATEST(FLOOR(base.total_stock / 4.0)::int, 1)
  ),
  jsonb_build_object(
    'label', '8×10"',
    'label_bn', '৮×১০"',
    'price', ROUND(base.base_price * 1.25),
    'original_price', ROUND(base.base_original * 1.25),
    'stock', GREATEST(FLOOR(base.total_stock / 4.0)::int, 1)
  ),
  jsonb_build_object(
    'label', '10×12"',
    'label_bn', '১০×১২"',
    'price', ROUND(base.base_price * 1.55),
    'original_price', ROUND(base.base_original * 1.55),
    'stock', GREATEST(FLOOR(base.total_stock / 4.0)::int, 1)
  ),
  jsonb_build_object(
    'label', '12×16"',
    'label_bn', '১২×১৬"',
    'price', ROUND(base.base_price * 1.95),
    'original_price', ROUND(base.base_original * 1.95),
    'stock', GREATEST(
      base.total_stock - 3 * GREATEST(FLOOR(base.total_stock / 4.0)::int, 1),
      1
    )
  )
)
FROM (
  SELECT
    p.id,
    COALESCE(
      (
        SELECT MIN((elem->>'price')::numeric)
        FROM jsonb_array_elements(p.sizes) AS elem
        WHERE (elem->>'price') IS NOT NULL
      ),
      p.price
    ) AS base_price,
    COALESCE(
      (
        SELECT MIN((elem->>'original_price')::numeric)
        FROM jsonb_array_elements(p.sizes) AS elem
        WHERE (elem->>'original_price') IS NOT NULL
      ),
      p.original_price,
      p.price
    ) AS base_original,
    GREATEST(p.stock, 4) AS total_stock
  FROM products p
) AS base
WHERE products.id = base.id
  AND jsonb_array_length(COALESCE(products.sizes, '[]'::jsonb)) > 0;

UPDATE products
SET price = (sizes->0->>'price')::numeric,
    original_price = (sizes->0->>'original_price')::numeric
WHERE jsonb_array_length(sizes) > 0;
