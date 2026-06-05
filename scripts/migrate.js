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
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function main() {
  const dir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(dir).sort();
  for (const file of files) {
    console.log(`Running ${file}...`);
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const runWholeFile = /^010_reviews/.test(file);
    const statements = runWholeFile
      ? [sql.replace(/^\s*(--[^\n]*\n)+/gm, '').trim()]
      : sql
          .split(';')
          .map((s) => s.replace(/^\s*(--[^\n]*\n)+/gm, '').trim())
          .filter((s) => s.length > 0);
    for (const stmt of statements) {
      try {
        await runQuery(runWholeFile ? stmt : stmt + ';');
      } catch (e) {
        if (!String(e.message).includes('already exists')) console.warn(e.message.slice(0, 120));
      }
    }
    console.log(`✓ ${file}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
