#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function main() {
  const user = process.env.ADMIN_USERNAME || 'admin';
  const pass = process.env.ADMIN_PASSWORD || 'wallnest123';

  const loginRes = await fetch('http://localhost:3000/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
    redirect: 'manual',
  });
  const cookie = loginRes.headers.getSetCookie?.()?.join('; ') || loginRes.headers.get('set-cookie') || '';
  if (!cookie) {
    console.error('Login failed — no session cookie', loginRes.status);
    process.exit(1);
  }

  const imgPath = path.join(__dirname, '..', 'public', 'images', 'hero', 'islamic-wall-art.jpg');
  const fd = new FormData();
  fd.append(
    'image',
    new Blob([fs.readFileSync(imgPath)], { type: 'image/jpeg' }),
    'test.jpg'
  );

  const up = await fetch('http://localhost:3000/api/admin/upload', {
    method: 'POST',
    body: fd,
    headers: { cookie },
  });
  const text = await up.text();
  console.log('upload status:', up.status);
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
