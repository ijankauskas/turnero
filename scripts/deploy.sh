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

echo "==> sync Next public env (apps/web/.env)"
if [ -f .env ]; then
  grep -E '^NEXT_PUBLIC_' .env > apps/web/.env || true
fi
# Fallback si no está en el .env raíz
if [ ! -s apps/web/.env ] && [ -n "${NEXT_PUBLIC_API_URL:-}" ]; then
  echo "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" > apps/web/.env
fi

echo "==> stop web antes del build (evita servir .next a medias)"
if systemctl list-unit-files | grep -q turnero-web.service; then
  systemctl stop turnero-web || true
fi

echo "==> build shared + migrate + build apps"
npm run build:shared
npm run db:generate
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
rm -rf apps/api/dist apps/api/tsconfig.tsbuildinfo apps/api/tsconfig.build.tsbuildinfo
rm -rf apps/web/.next
npm run build
test -f apps/api/dist/main.js
test -f apps/api/dist/app.module.js
test -d apps/web/.next

echo "==> restart services"
if systemctl list-unit-files | grep -q turnero-api.service; then
  systemctl restart turnero-api
  systemctl start turnero-web
  systemctl --no-pager --full status turnero-api turnero-web || true
else
  echo "WARN: systemd units turnero-api/web todavía no existen; skip restart"
fi

echo "==> deploy OK"
