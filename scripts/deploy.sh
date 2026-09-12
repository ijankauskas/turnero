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

echo "==> sync env for Next (NEXT_PUBLIC_* se lee desde apps/web/.env)"
if [ -f .env ]; then
  # Next no lee el .env de la raíz del monorepo al buildear
  grep -E '^(NEXT_PUBLIC_|API_PUBLIC_URL=)' .env > apps/web/.env || true
  # Asegurar que la API también tenga el .env actualizado (sin pisar si ya existe custom)
  if [ ! -f apps/api/.env ]; then
    cp .env apps/api/.env
  fi
fi

echo "==> build shared + migrate + build apps"
npm run build:shared
npm run db:generate
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
# Limpiar dist previo (evita nest build incremental vacío)
rm -rf apps/api/dist apps/api/tsconfig.tsbuildinfo apps/api/tsconfig.build.tsbuildinfo
npm run build
test -f apps/api/dist/main.js
test -f apps/api/dist/app.module.js
# Sanity: el bundle del web no debería apuntar a localhost en prod
if grep -R -l 'localhost:3001' apps/web/.next/static 2>/dev/null | head -1 | grep -q .; then
  echo "WARN: el build del web todavía contiene localhost:3001 — revisá apps/web/.env"
fi


echo "==> restart services"
if systemctl list-unit-files | grep -q turnero-api.service; then
  systemctl restart turnero-api turnero-web
  systemctl --no-pager --full status turnero-api turnero-web || true
else
  echo "WARN: systemd units turnero-api/web todavía no existen; skip restart"
fi

echo "==> deploy OK"
