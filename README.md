# Turnero

SaaS multiempresa de agenda para peluquerías, centros de estética y consultorios.

Este repositorio todavía no contiene código de producto. El punto de partida es el **documento maestro**: cierra las reglas de negocio, el modelo de datos, la arquitectura y el corte del MVP **antes de programar**.

## Documento maestro

- [docs/DOCUMENTO-MAESTRO.md](docs/DOCUMENTO-MAESTRO.md) — visión, roles, arquitectura, modelo, reglas, pantallas, API, frontend, agenda, reportes, comunicaciones, seguridad, MVP, roadmap y mapa de Trello.
- [docs/referencias/agenda-studio-elegance.png](docs/referencias/agenda-studio-elegance.png) — referencia visual de la agenda (día por profesional).

## Stack acordado

| Capa | Tecnología |
| --- | --- |
| API | NestJS |
| Web | Next.js |
| Base de datos | PostgreSQL |
| Jobs (email) | cola asíncrona (BullMQ + Redis) |

## Principio no negociable

El aislamiento entre empresas y entre profesionales se aplica **en el backend**. Ocultar columnas en el frontend no es autorización.
