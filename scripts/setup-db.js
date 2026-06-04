/**
 * Runs schema.sql against Supabase via Management API.
 * Usage: node scripts/setup-db.js
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
    const msg = typeof data === 'object' ? JSON.stringify(data) : data;
    throw new Error(`Query failed (${res.status}): ${msg}`);
  }
  return data;
}

async function main() {
  if (!ACCESS_TOKEN) {
    console.error('Missing SUPABASE_ACCESS_TOKEN in .env');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(`Running ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    const preview = stmt.slice(0, 60).replace(/\s+/g, ' ');
    try {
      await runQuery(stmt);
      console.log(`✓ [${i + 1}/${statements.length}] ${preview}...`);
    } catch (err) {
      if (
        err.message.includes('already exists') ||
        err.message.includes('duplicate')
      ) {
        console.log(`⊘ [${i + 1}] skipped (exists): ${preview}...`);
      } else {
        console.error(`✗ [${i + 1}] ${preview}...`);
        console.error(err.message);
      }
    }
  }

  console.log('\nSchema setup complete. Run: npm run seed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
