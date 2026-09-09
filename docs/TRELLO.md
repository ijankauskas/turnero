# Mapa Trello — Turnero

**Tablero:** [Turnero — Agenda SaaS](https://trello.com/b/QdSMqCWX/turnero-agenda-saas)  
**Workspace:** SIEMPRE  
**Fuente de verdad:** [DOCUMENTO-MAESTRO.md](DOCUMENTO-MAESTRO.md)

## Listas

| Lista | Uso |
| --- | --- |
| Documento maestro | DOC-000 |
| Decisiones cerradas | DEC-A … DEC-H |
| Épicas | EP-01 … EP-14 |
| Backlog MVP | 25 historias espina (orden de construcción) |
| Detalle MVP | Historias atómicas (infra, dominio, UI, mails, seguridad) |
| Roadmap | Post-MVP y won't-do |

Toda PR de código debe citar un ID de **Backlog MVP** o **Detalle MVP**.

## Backlog MVP (espina)

1. [INF-001](https://trello.com/c/YSKcPd89) Monorepo NestJS + Next.js + Postgres
2. [TEN-001](https://trello.com/c/3D1vp4IN) Empresa, branding, TZ y moneda
3. [AUTH-001](https://trello.com/c/ZzpgAIMJ) Login JWT y `/me`
4. [AUTH-002](https://trello.com/c/ubcx1p2J) RBAC de 4 roles
5. [BRN-001](https://trello.com/c/bHHSqb94) Sucursales
6. [USR-001](https://trello.com/c/Ei6Ma5TY) ABM usuarios
7. [PRO-001](https://trello.com/c/PcwUqPZS) Profesionales N:N sucursales
8. [PRO-002](https://trello.com/c/s7hSnmSf) Horarios semanales
9. [SVC-001](https://trello.com/c/vDMHhoI8) Catálogo de servicios
10. [SVC-002](https://trello.com/c/K8zHziS4) Precio y comisión por profesional
11. [CLI-001](https://trello.com/c/CUJcTdVJ) Clientes y duplicado de teléfono
12. [APT-001](https://trello.com/c/0PY1WcKH) Turnos, estados, snapshots, pagado
13. [APT-002](https://trello.com/c/nVTuSXBy) Alta/edición con conflictos
14. [APT-003](https://trello.com/c/H9EZOvxq) Cancelación histórica
15. [AVL-001](https://trello.com/c/2ZFIBuL0) Disponibilidad
16. [AUTH-003](https://trello.com/c/yqCqFX1G) Juan no ve a Noelia
17. [SEC-001](https://trello.com/c/HZ2AJrIA) Tests e2e tenant/RBAC
18. [UI-001](https://trello.com/c/HBwAt99G) Shell y branding
19. [UI-002](https://trello.com/c/Iy3fy76O) Agenda Día
20. [UI-003](https://trello.com/c/hOSXBnPj) Día / Semana / Mes
21. [UI-004](https://trello.com/c/0kNEpB47) Panel de turno + WhatsApp
22. [UI-005](https://trello.com/c/RRaGKdLd) Clientes, prestaciones, config (ver detalle UI-006+)
23. [NTF-001](https://trello.com/c/Ez15UHfW) Cola de email
24. [RPT-001](https://trello.com/c/MUdBUPb8) Reporte de profesionales
25. [RPT-002](https://trello.com/c/nbJGTy8t) Cifras del día

## Detalle MVP

### Infra

- [INF-002](https://trello.com/c/CivGeeM3) Docker Compose Postgres + Redis
- [INF-003](https://trello.com/c/8YT4V3H7) packages/shared enums
- [INF-004](https://trello.com/c/ckElxg9G) Seed Studio Élégance
- [INF-005](https://trello.com/c/t55g5FJu) CI lint y tests
- [INF-006](https://trello.com/c/aYQOhJII) .env.example y setup
- [INF-007](https://trello.com/c/W7X4gUUQ) Healthcheck y logs

### Tenant y auth

- [TEN-002](https://trello.com/c/d0jdqgVk) TenantGuard en repositorios
- [TEN-003](https://trello.com/c/qxFqaIcx) Login y slug
- [TEN-004](https://trello.com/c/keNjkIzo) Branding editable
- [TEN-005](https://trello.com/c/LhelgDTf) UTC / timezone empresa
- [AUTH-004](https://trello.com/c/caBLeUsT) Refresh y logout
- [AUTH-005](https://trello.com/c/D2S6GCMO) Rate limit login
- [AUTH-006](https://trello.com/c/C0OIL6Tz) Email unique por empresa
- [AUTH-007](https://trello.com/c/jaLB7SEE) Payload JWT
- [AUTH-008](https://trello.com/c/eDP9uWwP) Usuario inactivo no entra

### Usuarios, sucursales, profesionales, servicios, clientes

- [USR-002](https://trello.com/c/rGbofMUR) Encargado/Recepción exigen sucursal
- [USR-003](https://trello.com/c/FbjUbsOk) Profesional 1:1 con User
- [USR-004](https://trello.com/c/GzLDlnBV) Desactivar catálogos
- [BRN-002](https://trello.com/c/iz115uoD) Empresa nace con sucursal
- [PRO-003](https://trello.com/c/LxTxry2g) Color en la agenda
- [PRO-004](https://trello.com/c/FfH02HYw) Horario: no dos sucursales a la vez
- [SVC-003](https://trello.com/c/5Rb5uR1z) Precio default = base
- [SVC-004](https://trello.com/c/L6YLZXOQ) Validar comisión % o fijo
- [CLI-002](https://trello.com/c/oMipgc6V) Búsqueda teléfono/nombre
- [CLI-003](https://trello.com/c/NYQxMiMS) Historial en ficha
- [CLI-004](https://trello.com/c/imaRUIvx) Profesional solo SUS clientes

### Turnos, pago, notas

- [APT-004](https://trello.com/c/AJuOKMWj) Transiciones de estado
- [APT-005](https://trello.com/c/Bn0EUeTD) Marcar pagado
- [APT-006](https://trello.com/c/ThTg7T2e) Observaciones vs notas internas
- [APT-007](https://trello.com/c/9vxW3agw) Snapshots precio/duración/comisión
- [APT-008](https://trello.com/c/fcbQ2Tbp) Recorte de listado por rol
- [PAY-001](https://trello.com/c/UxOFccEJ) Tabla Payment sin UI
- [NOTE-001](https://trello.com/c/behgXbGc) Notas del día (nice-to-have)

### UI

- [UI-006](https://trello.com/c/ZFxCYk4x) Login
- [UI-007](https://trello.com/c/h8ZthiQq) Listado clientes
- [UI-008](https://trello.com/c/3OlkAUck) Ficha cliente
- [UI-009](https://trello.com/c/D40Uj7lm) Alta con duplicado
- [UI-010](https://trello.com/c/k9MUDiJ6) ABM prestaciones
- [UI-011](https://trello.com/c/UrvJlEnI) Matriz precio/comisión
- [UI-012](https://trello.com/c/jy6yxWnC) Config empresa
- [UI-013](https://trello.com/c/ps4aIl3t) ABM sucursales
- [UI-014](https://trello.com/c/gM8SRrOB) ABM usuarios
- [UI-015](https://trello.com/c/Lfkb29Ns) Ficha profesional
- [UI-016](https://trello.com/c/0Lydddl6) Editor horarios
- [UI-017](https://trello.com/c/raejDUoi) Pantalla reportes
- [UI-018](https://trello.com/c/s31Ywz8Z) Mini-calendario
- [UI-019](https://trello.com/c/uS3IH5yz) Filtro colaboradores
- [UI-020](https://trello.com/c/k9vSWGxh) Alta desde hueco
- [UI-021](https://trello.com/c/AV8EjNw2) Selector sucursal Admin
- [UI-022](https://trello.com/c/CokMplBP) Nav y rutas por rol
- [UI-023](https://trello.com/c/cvQT7IOG) Copy es-AR y fechas

### Emails, reportes, seguridad

- [NTF-002](https://trello.com/c/0zM2Oosb) Link WhatsApp
- [NTF-003](https://trello.com/c/P2nM8Pnn) Email reservado
- [NTF-004](https://trello.com/c/vRsPGzpS) Email modificado
- [NTF-005](https://trello.com/c/yfj3NlRx) Email cancelado
- [NTF-006](https://trello.com/c/tKdFNxzU) Jobs sin bloquear el turno
- [RPT-003](https://trello.com/c/M7AuCAU6) Próximo turno / en curso
- [RPT-004](https://trello.com/c/w3fBgwaq) Tasa de ocupación
- [RPT-005](https://trello.com/c/ueuKZyNw) Alcance del reporte por rol
- [SEC-002](https://trello.com/c/sZG8dwTb) Hash de passwords
- [SEC-003](https://trello.com/c/XW1HH08N) companyId no sale del body
- [SEC-004](https://trello.com/c/SRmccR9x) 404 en get ajeno
- [SEC-005](https://trello.com/c/vSPdhdjC) Headers y logs deny

## Roadmap

- [FUT-001](https://trello.com/c/ShUWb3Js) Servicios compuestos
- [FUT-002](https://trello.com/c/hjaE1cPO) Recursos / cabinas
- [FUT-003](https://trello.com/c/kQmLZ2Jy) Caja y pagos parciales
- [FUT-004](https://trello.com/c/cdc4mO6D) WhatsApp Business API
- [FUT-005](https://trello.com/c/7S4Uf9ED) Recordatorio email 24 h
- [FUT-006](https://trello.com/c/kEfNhNcL) Reserva online
- [FUT-007](https://trello.com/c/ss1NuvpW) Dominios custom
- [FUT-008](https://trello.com/c/D6n8HoY8) Drag & drop
- [FUT-009](https://trello.com/c/QKkq9Son) Estados EN_ESPERA / REPROGRAMADO
- [FUT-010](https://trello.com/c/JxT28FkA) App nativa
- [FUT-011](https://trello.com/c/5ZxbMFOp) Multi-idioma
- [FUT-012](https://trello.com/c/ghbunKyM) Campana in-app
- [FUT-013](https://trello.com/c/3uUt9Ryk) Export CSV
- [FUT-014](https://trello.com/c/tRxQpFxL) NO: liquidación AFIP
- [FUT-015](https://trello.com/c/jQvYfn1y) Excepciones de horario / vacaciones
