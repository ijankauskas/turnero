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
# Limpiar dist previo (evita nest build incremental vacío)
rm -rf apps/api/dist apps/api/tsconfig.tsbuildinfo apps/api/tsconfig.build.tsbuildinfo
npm run build
test -f apps/api/dist/main.js
test -f apps/api/dist/app.module.js

echo "==> restart services"
if systemctl list-unit-files | grep -q turnero-api.service; then
  systemctl restart turnero-api turnero-web
  systemctl --no-pager --full status turnero-api turnero-web || true
else
  echo "WARN: systemd units turnero-api/web todavía no existen; skip restart"
fi

echo "==> deploy OK"
