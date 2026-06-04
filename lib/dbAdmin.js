/**
 * Server-side DB writes via Supabase Management API (bypasses RLS for admin).
 */
require('dotenv').config();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'jusvsnfxwnrkhuuyrbbr';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function adminQuery(query, params = []) {
  if (!ACCESS_TOKEN) {
    throw new Error('SUPABASE_ACCESS_TOKEN required for admin database operations');
  }

  let sql = query;
  params.forEach((val, i) => {
    const escaped =
      val === null || val === undefined
        ? 'NULL'
        : typeof val === 'number'
          ? String(val)
          : `'${String(val).replace(/'/g, "''")}'`;
    sql = sql.replace(`$${i + 1}`, escaped);
  });

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
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

module.exports = { adminQuery };
