-- Steadfast courier consignment tracking on orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_consignment_id BIGINT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_tracking_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_synced_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_error TEXT;

CREATE INDEX IF NOT EXISTS orders_courier_consignment_id_idx
  ON orders (courier_consignment_id);
