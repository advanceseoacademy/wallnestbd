ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('bkash', 'rocket', 'nagad', 'cod') OR payment_method IS NULL);

UPDATE site_settings
SET value = value || jsonb_build_object(
  'cod', jsonb_build_object(
    'enabled', true,
    'label', 'Cash on Delivery',
    'account_type', '',
    'number', '',
    'instructions', 'ডেলিভারির সময় কুরিয়ারকে ক্যাশে পেমেন্ট করুন'
  )
),
updated_at = NOW()
WHERE key = 'payment_methods'
  AND NOT (value ? 'cod');
