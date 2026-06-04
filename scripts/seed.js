/**
 * Seed categories, products, and reviews via Supabase Management API (bypasses RLS).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jusvsnfxwnrkhuuyrbbr';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function runQuery(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(typeof data === 'object' ? JSON.stringify(data) : data);
  }
  return data;
}

async function main() {
  if (!ACCESS_TOKEN) {
    console.error('Missing SUPABASE_ACCESS_TOKEN');
    process.exit(1);
  }

  const seedPath = path.join(__dirname, '..', 'supabase', 'seed.sql');
  const sql = fs.readFileSync(seedPath, 'utf8');

  console.log('Seeding database...');
  await runQuery(sql);
  console.log('✓ Seed complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
