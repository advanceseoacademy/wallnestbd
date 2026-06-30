const DEFAULT_PAYMENT_METHODS = {
  bkash: {
    enabled: true,
    label: 'bKash',
    account_type: 'Personal',
    number: '01309093407',
    instructions: 'bKash Send Money করুন, তারপর Transaction ID দিন',
  },
  nagad: {
    enabled: true,
    label: 'Nagad',
    account_type: 'Personal',
    number: '01309093407',
    instructions: 'Nagad Send Money করুন, তারপর Transaction ID দিন',
  },
  rocket: {
    enabled: true,
    label: 'Rocket',
    account_type: 'Personal',
    number: '01757591788',
    instructions: 'Rocket Send Money করুন, তারপর Transaction ID দিন',
  },
  cod: {
    enabled: true,
    label: 'Cash on Delivery',
    account_type: '',
    number: '',
    instructions: 'ডেলিভারির সময় কুরিয়ারকে ক্যাশে পেমেন্ট করুন',
  },
};

const PLACEHOLDER_NUMBERS = new Set(['01XXXXXXXXX', '01XXXXXXXX', '']);

function normalizePaymentNumber(number, fallback) {
  const n = String(number || '').trim();
  if (!n || PLACEHOLDER_NUMBERS.has(n)) return fallback;
  return n;
}

function mergePaymentSettings(stored = {}) {
  const out = {};
  for (const key of Object.keys(DEFAULT_PAYMENT_METHODS)) {
    const base = DEFAULT_PAYMENT_METHODS[key];
    const row = stored[key] || {};
    out[key] = {
      ...base,
      ...row,
      number: normalizePaymentNumber(row.number, base.number),
      label: row.label || base.label,
      account_type: row.account_type || base.account_type,
      instructions: row.instructions || base.instructions,
      enabled: row.enabled !== false,
    };
  }
  return out;
}

module.exports = {
  DEFAULT_PAYMENT_METHODS,
  mergePaymentSettings,
};
