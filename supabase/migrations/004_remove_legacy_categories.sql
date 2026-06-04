DELETE FROM categories
WHERE slug IN (
  'electronics',
  'fashion',
  'home',
  'beauty',
  'toys',
  'sports',
  'grocery',
  'pets',
  'tools'
);

DELETE FROM categories
WHERE slug NOT IN (
  'all',
  'islamic-wall-art',
  'family-photo-canvas',
  'kids-room-art',
  'office-motivational-art',
  'abstract-wall-art'
);
