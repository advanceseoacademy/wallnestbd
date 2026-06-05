/**
 * Re-seed customer reviews (uses Management API — bypasses RLS).
 * Run after migrate wiped reviews due to SQL parse issues.
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
    console.error('Missing SUPABASE_ACCESS_TOKEN in .env');
    process.exit(1);
  }

  const sqlPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '010_reviews_long_human.sql'
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Seeding reviews...');
  await runQuery(sql);
  console.log('✓ 30 reviews seeded');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
