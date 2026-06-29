const { createClient } = require('@supabase/supabase-js');

let ws;
try {
  ws = require('ws');
} catch {
  ws = undefined;
}

const url = process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (!url || !key) {
  console.warn('Warning: SUPABASE_URL or key missing. Set .env before running.');
} else {
  supabase = createClient(url, key, {
    realtime: ws ? { transport: ws } : undefined,
  });
}

module.exports = { supabase };
