#!/usr/bin/env bash
# WallNest BD — VPS deploy / restart (run from project root on the server)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Pull latest code"
git pull

echo "==> Install dependencies"
npm install
npm install --prefix admin-api

echo "==> Build"
npm run build

echo "==> Uploads folder writable"
mkdir -p public/uploads/products public/uploads/categories
chmod -R 775 public/uploads

echo "==> Restart PM2"
if pm2 describe wallnestbd-web >/dev/null 2>&1; then
  pm2 restart ecosystem.config.cjs
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

echo "==> Health check"
sleep 2
curl -sf -o /dev/null http://127.0.0.1:3010/ && echo "OK: web :3010" || echo "FAIL: web :3010"
curl -sf -o /dev/null http://127.0.0.1:3012/api/admin/categories && echo "OK: admin :3012" || echo "FAIL: admin :3012"

pm2 status
echo "Done. If site still shows 503, check CyberPanel proxy points to 127.0.0.1:3010"
