# Turnero

SaaS multiempresa de agenda para peluquerías, centros de estética y consultorios.

## Documento maestro

- [docs/DOCUMENTO-MAESTRO.md](docs/DOCUMENTO-MAESTRO.md)
- [docs/TRELLO.md](docs/TRELLO.md)
- [docs/referencias/agenda-studio-elegance.png](docs/referencias/agenda-studio-elegance.png)

## Stack

| Capa | Tecnología |
| --- | --- |
| API | NestJS (`apps/api`) — prefijo `/api/v1` |
| Web | Next.js App Router (`apps/web`) |
| Compartido | `@turnero/shared` |
| Base de datos | PostgreSQL + Prisma |
| Jobs | Redis (compose listo; worker en NTF-001) |

## Levantar en local

```bash
cp .env.example .env
cp .env.example apps/api/.env

# Docker (INF-002), o Postgres del sistema con las mismas credenciales
docker compose up -d

npm install
npm run build:shared
npm run db:migrate
npm run db:seed
npm run dev:api   # http://localhost:3001/api/v1/health
npm run dev:web   # http://localhost:3000
```

Si no hay Docker, con Postgres 16 local:

```bash
sudo -u postgres createuser -P turnero   # password: turnero
sudo -u postgres createdb -O turnero turnero
sudo -u postgres psql -d turnero -c 'CREATE EXTENSION IF NOT EXISTS citext;'
```

## Principio no negociable

El aislamiento entre empresas y entre profesionales se aplica **en el backend**. Ocultar columnas en el frontend no es autorización.
