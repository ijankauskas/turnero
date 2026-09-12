#!/usr/bin/env bash
# Deploy en el VPS (Hetzner). Lo invoca GitHub Actions por SSH.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/turnero}"
cd "$APP_DIR"

echo "==> git pull"
git fetch origin main
git reset --hard origin/main

echo "==> npm ci"
npm ci

echo "==> build shared + migrate + build apps"
npm run build:shared
npm run db:generate
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npm run build

echo "==> restart services"
systemctl restart turnero-api turnero-web
systemctl --no-pager --full status turnero-api turnero-web || true

echo "==> deploy OK"
