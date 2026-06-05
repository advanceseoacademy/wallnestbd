UPDATE site_settings
SET value = jsonb_build_object(
  'bkash', jsonb_build_object(
    'enabled', true,
    'label', 'bKash',
    'account_type', 'Personal',
    'number', '01309093407',
    'instructions', 'bKash Send Money করুন, তারপর Transaction ID দিন'
  ),
  'nagad', jsonb_build_object(
    'enabled', true,
    'label', 'Nagad',
    'account_type', 'Personal',
    'number', '01309093407',
    'instructions', 'Nagad Send Money করুন, তারপর Transaction ID দিন'
  ),
  'rocket', jsonb_build_object(
    'enabled', true,
    'label', 'Rocket',
    'account_type', 'Personal',
    'number', '01757591788',
    'instructions', 'Rocket Send Money করুন, তারপর Transaction ID দিন'
  )
),
updated_at = NOW()
WHERE key = 'payment_methods';
