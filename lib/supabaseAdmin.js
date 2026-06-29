const { createClient } = require('@supabase/supabase-js');

let ws;
try {
  ws = require('ws');
} catch {
  ws = undefined;
}

let adminClient = null;
let resolvedKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
let keyPromise = null;

async function fetchServiceRoleFromManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!token || !ref) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY প্রয়োজন। Supabase → Settings → API → service_role কী .env এ যোগ করুন।'
    );
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY পাওয়া যায়নি। .env এ service_role কী যোগ করুন।'
    );
  }

  const serviceRole = Array.isArray(data)
    ? data.find((k) => k.name === 'service_role')
    : null;
  const apiKey = serviceRole?.api_key;
  if (!apiKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY পাওয়া যায়নি। .env এ service_role কী যোগ করুন।'
    );
  }

  resolvedKey = apiKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = apiKey;
  return apiKey;
}

async function ensureServiceRoleKey() {
  if (resolvedKey) return resolvedKey;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    resolvedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return resolvedKey;
  }
  if (!keyPromise) keyPromise = fetchServiceRoleFromManagementApi();
  return keyPromise;
}

function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.SUPABASE_URL;
  const key = resolvedKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY প্রয়োজন। Supabase → Settings → API → service_role কী .env এ যোগ করুন।'
    );
  }

  adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: ws ? { transport: ws } : undefined,
  });

  return adminClient;
}

async function getSupabaseAdminAsync() {
  await ensureServiceRoleKey();
  return getSupabaseAdmin();
}

module.exports = {
  ensureServiceRoleKey,
  getSupabaseAdmin,
  getSupabaseAdminAsync,
};
