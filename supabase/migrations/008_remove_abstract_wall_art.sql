-- Remove Abstract Wall Art category and its products

DELETE FROM reviews
WHERE product_id IN (
  SELECT p.id FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE c.slug = 'abstract-wall-art'
);

DELETE FROM cart_items
WHERE product_id IN (
  SELECT p.id FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE c.slug = 'abstract-wall-art'
);

DELETE FROM products
WHERE category_id IN (SELECT id FROM categories WHERE slug = 'abstract-wall-art');

DELETE FROM categories WHERE slug = 'abstract-wall-art';

-- Redistribute catalog mix (was 10% on abstract → office)
UPDATE categories SET catalog_share = 20 WHERE slug = 'office-motivational-art';
