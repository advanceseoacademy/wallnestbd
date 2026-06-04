-- WallNest BD wall art catalog categories + target mix (%)

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS catalog_share INT DEFAULT NULL;

COMMENT ON COLUMN categories.catalog_share IS 'Target catalog mix percentage (0-100), excluding "all"';
