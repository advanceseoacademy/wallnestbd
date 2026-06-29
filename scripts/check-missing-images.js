#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { supabase } = require('../lib/supabase');

const root = path.join(__dirname, '..');

async function main() {
  const { data, error } = await supabase
    .from('products')
    .select('id,name_en,slug,image_url,images');
  if (error) throw error;

  let missing = 0;
  for (const p of data || []) {
    const urls = [...new Set([...(p.images || []), p.image_url].filter(Boolean))];
    for (const u of urls) {
      const rel = u.replace(/^\//, '');
      const fp = path.join(root, 'public', rel.replace(/^uploads\//, 'uploads/'));
      if (!fs.existsSync(fp)) {
        missing += 1;
        console.log(`MISSING  ${p.slug}\n         ${u}`);
      }
    }
  }
  console.log(`\nTotal missing files: ${missing}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
