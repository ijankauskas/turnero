# Turnero — Documento maestro del producto

**Estado:** decisiones de dominio cerradas. No se programa hasta que este documento sea la fuente de verdad del MVP.

**Producto:** SaaS multiempresa de agenda, turnos, clientes, servicios, pagos simples y reportes de profesionales.

**Stack:** NestJS (API) + Next.js (web) + PostgreSQL + cola asíncrona para emails.

**Referencia visual de agenda:** [referencias/agenda-studio-elegance.png](referencias/agenda-studio-elegance.png)

---

## Índice

1. [Visión del producto](#1-visión-del-producto)
2. [Roles y permisos](#2-roles-y-permisos)
3. [Arquitectura](#3-arquitectura)
4. [Modelo de datos completo](#4-modelo-de-datos-completo)
5. [Reglas de negocio](#5-reglas-de-negocio)
6. [Pantallas](#6-pantallas)
7. [API NestJS](#7-api-nestjs)
8. [Frontend Next.js](#8-frontend-nextjs)
9. [Agenda](#9-agenda)
10. [Reportes](#10-reportes)
11. [Emails y WhatsApp](#11-emails-y-whatsapp)
12. [Seguridad multiempresa](#12-seguridad-multiempresa)
13. [MVP](#13-mvp)
14. [Roadmap futuro](#14-roadmap-futuro)
15. [Tarjetas de Trello](#15-tarjetas-de-trello)

---

## Decisiones cerradas (preguntas A–H)

Estas reglas ya no están abiertas. Cambiarlas implica migrar el modelo.

### Las 3 que definen el modelo (A, B, C)

**A. Un profesional puede trabajar en varias sucursales.**  
Sí. María puede estar lunes y martes en Centro, miércoles y jueves en Norte. El vínculo no es `profesional.sucursalId` único: es una asignación N:N más un horario por día.

**B. Un profesional tiene un subconjunto de servicios.**  
Sí. Al agendar con Juan solo aparecen *sus* servicios. Precio y comisión se resuelven en el cruce profesional × servicio.

**C. El horario pertenece al profesional, en una sucursal, ese día.**  

```
Profesional → horario de trabajo → sucursal donde trabaja ese día
```

No hay un único “horario de la sucursal” que mande sobre la agenda. La sucursal puede tener datos de contacto y dirección; la disponibilidad se calcula con el horario del profesional.

### El resto (D–H)

**D. Cancelación.** El turno nunca se borra. Pasa a `CANCELADO` y queda en el historial (quién, cuándo, motivo opcional).

**E. Vista inicial de agenda.** Ambas, con selector `[Día] [Semana] [Mes]`. Vista por defecto: **Día** (columnas por profesional, como la referencia). Semana y mes para planificación.

**F. Turnos largos.** Sí. Un servicio de 10:30 a 12:00 ocupa visualmente todo ese bloque. `horaFin` se deriva de `horaInicio + duración`.

**G. Clientes duplicados.** El teléfono es el mecanismo principal de búsqueda. Si ya existe, se advierte y se permite crear igual si el usuario confirma que es otra persona. No hay unique estricto de teléfono.

**H. Tenant isolation.** Desde el día uno. Cada empresa tiene moneda, zona horaria, logo, colores y email. Un usuario de Empresa A no puede leer ni escribir nada de Empresa B. El `companyId` sale del token, nunca del body como fuente de verdad.

---

## 1. Visión del producto

Turnero es un **SaaS multiempresa**. Una sola plataforma sirve a peluquerías, estéticas y consultorios, cada uno con su marca, sucursales y profesionales.

```
                    AGENDA SaaS
                        │
              ┌─────────┴─────────┐
              │                   │
          Empresa A           Empresa B
              │                   │
       ┌──────┴──────┐      ┌─────┴─────┐
    Sucursal 1    Sucursal 2   Sucursal 1
       │              │            │
   Profesionales   Profesionales  Profesionales
       │
     Agenda
       │
    Turnos
       │
   Clientes
       │
   Servicios
       │
    Pagos
       │
 Reportes / liquidaciones (reporte, no asiento contable)
```

Mañana se puede exponer:

- `peluqueria1.com`
- `estetica2.com`
- `consultorio3.com`

sin rediseñar el núcleo. En el MVP el aislamiento es por `companyId` + branding; el dominio custom queda preparado en el modelo (`slug`, `customDomain` nullable) y se activa en el roadmap.

### Qué problema resuelve

La recepción y el encargado necesitan ver **quién está ocupado, con quién, cuánto dura y cuánto sale**, en una grilla. El profesional solo debe ver **su** día. El dueño necesita saber cuánto se facturó y cuánto hay que pagarle a cada persona, sin un sistema contable.

### Qué no es (MVP)

- No es un ERP ni un sistema de caja completo.
- No es un marketplace ni reserva pública online (aún).
- No es una integración oficial de WhatsApp Business API.
- No liquida sueldos ni genera asientos; genera un **reporte de profesionales**.

### Promesa de producto

En menos de un minuto, recepción puede: elegir sucursal → profesional → servicio (duración y precio ya resueltos) → horario libre → cliente → confirmar. El cliente recibe un email. Si hay que hablarle, un botón abre WhatsApp Web con el mensaje armado.

---

## 2. Roles y permisos

Cuatro roles. El rol vive en el usuario, siempre dentro de una empresa.

| Rol | Alcance espacial | Idea |
| --- | --- | --- |
| `ADMINISTRADOR` | Toda la empresa | Dueño / socio. Configura el sistema. |
| `ENCARGADO` | Una sucursal (asignada) | Opera el local. |
| `RECEPCION` | Una sucursal (asignada) | Agenda, clientes, cobros. |
| `PROFESIONAL` | Sí mismo | Solo su agenda y los clientes de *sus* turnos. |

Un usuario `PROFESIONAL` está ligado 1:1 a un registro `Professional`. Juan no “es un filtro más”: **Juan es el profesional del token**.

### Matriz de permisos

| Capacidad | Admin | Encargado | Recepción | Profesional |
| --- | :---: | :---: | :---: | :---: |
| Ver agendas de toda la empresa | sí | no | no | no |
| Ver agendas de su sucursal | sí | sí | sí | no |
| Ver solo su propia agenda | sí | sí | sí | **sí, y nada más** |
| Crear / modificar / desactivar usuarios | sí | no | no | no |
| Crear sucursales | sí | no | no | no |
| Crear / editar profesionales | sí | no | no | no |
| Crear / editar servicios y precios base | sí | no | no | no |
| Configurar precio y comisión por profesional | sí | no | no | no |
| Configurar horarios | sí | no | no | no |
| Ver clientes de la empresa / sucursal | sí | sí | sí | solo los de sus turnos |
| Crear / editar clientes | sí | sí | sí | no |
| Crear turnos | sí | sí | sí | no |
| Modificar turnos | sí | sí | sí | no |
| Cancelar turnos (estado `CANCELADO`) | sí | sí | sí | no |
| Marcar ATENDIDO / NO_ASISTIO | sí | sí | sí | no |
| Registrar pagado / no pagado | sí | sí | sí | no |
| Ver todos los turnos de la empresa | sí | no | no | no |
| Ver turnos de su sucursal | sí | sí | sí | no |
| Ver reportes de la empresa | sí | no | no | no |
| Ver reportes de su sucursal | sí | sí | no | no |
| Ver liquidación / “a pagar” | sí | sí (su sucursal) | no | no |
| Cambiar branding, moneda, TZ, email | sí | no | no | no |

**Encargado** puede gestionar turnos y clientes de *su* sucursal, ver sus profesionales y los reportes de esa sucursal. No crea sucursales, usuarios ni el catálogo de la empresa.

**Recepción** agenda y cobra. No ve reportes ni liquidaciones.

**Profesional** es de solo lectura sobre su agenda. No lista colegas. No cambia `?professionalId=` para espiar a Noelia: el backend ignora ese parámetro y fuerza `professionalId = usuario.profesional.id`.

### Regla de oro de autorización

```
request.user.id
    → user.companyId          (tenant)
    → user.role               (qué puede hacer)
    → user.branchId           (si ENCARGADO / RECEPCION)
    → user.professionalId     (si PROFESIONAL)
    → turnos / recursos permitidos
```

Cualquier `GET /appointments?professionalId=noelia` hecho por Juan debe responder **403 o un listado que solo contiene a Juan**, nunca los turnos de Noelia. Tests de API cubren este caso como requisito de seguridad, no como detalle de UI.

---

## 3. Arquitectura

Monorepo previsto:

```
turnero/
  apps/api          NestJS
  apps/web          Next.js (App Router)
  packages/shared   tipos, enums, DTOs compartidos
  docs/             este documento
```

### Diagrama lógico

```
[Navegador Next.js]
        │  HTTPS + JWT
        ▼
[API NestJS]
  ├─ AuthModule          login, refresh, me
  ├─ TenantGuard         inyecta companyId desde el token
  ├─ RbacGuard           rol + alcance sucursal/profesional
  ├─ Companies / Branches / Users
  ├─ Professionals / Schedules / Services
  ├─ Clients
  ├─ Appointments
  ├─ Reports
  └─ Notifications       encola emails
        │
        ├─ PostgreSQL    fuente de verdad
        └─ Redis+BullMQ  jobs de email
                │
                ▼
         proveedor SMTP (Resend / SES / similar)
```

### Principios

1. **Un proceso de API, muchas empresas.** El tenant no es un schema Postgres por empresa en el MVP (más simple de operar). Aislamiento por `companyId` en cada fila + guards.
2. **El frontend no es de confianza.** Toda regla de visibilidad se revalida en la API.
3. **Instantes en UTC.** Se persisten `timestamptz`. La empresa tiene `timezone` (ej. `America/Argentina/Buenos_Aires`) para mostrar y para “el día laboral”.
4. **Snapshots en el turno.** Precio, duración y nombre del servicio se copian al crear/editar el turno. Si mañana cambia el precio de Uñas, los turnos viejos no se reescriben.
5. **Soft-delete / estados.** Clientes, servicios y profesionales se desactivan. Los turnos cambian de estado; no se `DELETE`.
6. **Cola para email.** Crear un turno no espera al SMTP. Si el mail falla, se reintenta; el turno ya existe.

### Auth

- Email + password por empresa (el mismo email podría existir en otra empresa; unique `(companyId, email)`).
- JWT de acceso corto + refresh token.
- Payload mínimo: `sub`, `companyId`, `role`, `branchId?`, `professionalId?`.
- En el MVP no hay SSO ni magic link.

### Identificación de empresa en el front

Para el MVP: el usuario entra a `app.turnero.com/login` y elige/resuelve empresa por email, **o** se usa un subpath/slug `app.turnero.com/e/peluqueria1`. El `companyId` definitivo siempre sale del login, no de un header editable.

Dominios propios (`peluqueria1.com`) = roadmap; el campo `customDomain` ya existe.

---

## 4. Modelo de datos completo

Convenciones:

- UUID `id` en todas las tablas.
- `company_id` en **todas** las tablas de negocio (incluido N:N).
- `created_at`, `updated_at`.
- `deleted_at` nullable en catálogos (usuario, sucursal, profesional, servicio, cliente). Los turnos **no** se borran: usan `status`.
- Importes en `numeric(12,2)`. Moneda en `companies.currency` (ISO 4217, default `ARS`).
- Duraciones en minutos enteros.

### 4.1 Company (tenant)

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| name | text | “Studio Élégance” |
| slug | text | unique, `studio-elegance` |
| custom_domain | text null | unique, roadmap |
| timezone | text | `America/Argentina/Buenos_Aires` |
| currency | char(3) | `ARS` |
| locale | text | `es-AR` |
| logo_url | text null | |
| primary_color | text null | branding |
| secondary_color | text null | |
| contact_email | text | remitente visible al cliente |
| contact_phone | text null | para WhatsApp de la empresa |
| active | bool | |

### 4.2 Branch (sucursal)

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| company_id | uuid | |
| name | text | Centro, Norte |
| address | text null | |
| phone | text null | |
| active | bool | |

Una empresa nace con al menos una sucursal.

### 4.3 User

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| company_id | uuid | |
| email | citext | unique con company |
| password_hash | text | |
| first_name, last_name | text | |
| phone | text null | |
| role | enum | `ADMINISTRADOR`, `ENCARGADO`, `RECEPCION`, `PROFESIONAL` |
| branch_id | uuid null | obligatorio si ENCARGADO o RECEPCION |
| professional_id | uuid null | obligatorio si PROFESIONAL |
| avatar_url | text null | |
| active | bool | |

### 4.4 Professional

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| company_id | uuid | |
| user_id | uuid | 1:1 con User |
| display_name | text | “María” |
| title | text null | Coiffeuse, Barbier |
| color | text | color de bloque en la agenda |
| active | bool | |

### 4.5 ProfessionalBranch (N:N)

Un profesional puede estar habilitado en varias sucursales.

| Campo | Tipo | Notas |
| --- | --- | --- |
| company_id | uuid | |
| professional_id | uuid | |
| branch_id | uuid | |
| is_primary | bool | sucursal “casa” |

Unique `(professional_id, branch_id)`.

### 4.6 WorkSchedule (horario)

Horario semanal recurrente: **profesional + sucursal + día de semana**.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| company_id | uuid | |
| professional_id | uuid | |
| branch_id | uuid | dónde trabaja ese día |
| weekday | smallint | 0=lunes … 6=domingo (ISO) |
| start_time | time | `09:00` |
| end_time | time | `18:00` |
| is_off | bool | franco |

Restricción: un profesional no puede tener dos horarios **solapados el mismo weekday en sucursales distintas**. Si el miércoles es Norte 09–18, no puede ser también Centro 09–18 ese mismo miércoles. Puede tener dos bloques el mismo día en la **misma** sucursal (09–13 y 15–19).

`WorkScheduleException` (vacaciones, franco extra, horario especial un día) queda **preparado** en el modelo y **fuera del MVP operativo** si complica: en MVP alcanza el semanal. Se documenta la tabla para no rediseñar:

| Campo | Tipo |
| --- | --- |
| professional_id, branch_id, company_id | uuid |
| date | date |
| type | `OFF` \| `CUSTOM` |
| start_time, end_time | time null |
| note | text null |

### 4.7 Service

Servicio simple. “Uñas + Pestañas” es **otro servicio**, no un compuesto, en el MVP.

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| company_id | uuid | |
| name | text | |
| duration_minutes | int | 30, 45, 90… |
| base_price | numeric(12,2) | |
| active | bool | |

### 4.8 ProfessionalService (qué hace, a qué precio, cómo se le paga)

| Campo | Tipo | Notas |
| --- | --- | --- |
| company_id | uuid | |
| professional_id | uuid | |
| service_id | uuid | |
| price | numeric(12,2) | precio de *este* profesional; si se omite al crear, copia `base_price` |
| remuneration_type | enum | `PERCENT` \| `FIXED` |
| remuneration_value | numeric(12,2) | 40 (=40%) o 8000 (pesos fijos) |
| active | bool | |

Unique `(professional_id, service_id)`.

Ejemplo:

| Servicio | Juan precio | Juan pago | María precio | María pago |
| --- | --- | --- | --- | --- |
| Uñas | 10.000 | 40% | 12.000 | 40% |
| Pestañas | 10.000 | $8.000 fijo | 15.000 | 30% |
| Uñas + Pestañas | 15.000 | 40% | 20.000 | 40% |

Al elegir María → Uñas + Pestañas el sistema ya sabe: duración 45 min (del servicio), precio $20.000 (del cruce).

### 4.9 Client

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| company_id | uuid | clientes son de la **empresa**, no de una sola sucursal |
| first_name, last_name | text | |
| phone | text | índice, no unique |
| email | text null | para notificaciones |
| notes | text null | ficha |
| duplicate_confirmed | bool | true si se creó pese a teléfono existente |
| active | bool | |

Índice `(company_id, phone)` para búsqueda, no unique.

### 4.10 Appointment (turno)

| Campo | Tipo | Notas |
| --- | --- | --- |
| id | uuid | |
| company_id | uuid | |
| branch_id | uuid | sucursal del turno (la del horario ese día) |
| professional_id | uuid | |
| client_id | uuid | |
| service_id | uuid | referencia; el snapshot manda |
| start_at | timestamptz | |
| end_at | timestamptz | start + duration |
| duration_minutes | int | snapshot |
| price | numeric(12,2) | snapshot |
| service_name_snapshot | text | |
| status | enum | ver 4.11 |
| paid | bool | default false |
| observations | text null | visibles en ficha / WhatsApp opcional |
| internal_notes | text null | solo staff |
| cancelled_at | timestamptz null | |
| cancelled_by_user_id | uuid null | |
| cancel_reason | text null | |
| created_by_user_id | uuid | |

Índices: `(company_id, professional_id, start_at)`, `(company_id, branch_id, start_at)`, `(company_id, client_id)`.

**No hay DELETE físico de turnos.**

### 4.11 Estados del turno

MVP:

| Estado | Significado |
| --- | --- |
| `RESERVADO` | creado, aún no confirmado |
| `CONFIRMADO` | el cliente o el local confirmó |
| `ATENDIDO` | se prestó el servicio; entra al reporte |
| `CANCELADO` | no se atiende; queda histórico |
| `NO_ASISTIO` | el cliente no vino |

Roadmap (columnas/enum ampliables): `EN_ESPERA`, `REPROGRAMADO`. Reprogramar en MVP = cancelar + crear otro, o editar fecha del mismo turno si se prefiere mantener el id (ver reglas).

### 4.12 Pago (MVP mínimo, modelo listo para crecer)

En el turno: `paid` boolean.

Tabla `Payment` **preparada, no usada en UI del MVP**:

| Campo | Tipo | Notas |
| --- | --- | --- |
| id, company_id, appointment_id | uuid | |
| amount | numeric | |
| method | enum futuro | efectivo, transferencia, etc. |
| paid_at | timestamptz | |
| created_by_user_id | uuid | |

Así no hay que romper el esquema cuando aparezcan pagos parciales o caja.

### 4.13 NotificationJob

| Campo | Tipo | Notas |
| --- | --- | --- |
| id, company_id, appointment_id | uuid | |
| channel | `EMAIL` \| `WHATSAPP` | WhatsApp en MVP es solo link, no job |
| type | `CREATED` \| `UPDATED` \| `CANCELLED` \| `REMINDER_24H` | reminder = roadmap |
| status | `PENDING` \| `SENT` \| `FAILED` | |
| payload | jsonb | destinatario, asunto, cuerpo |
| sent_at | timestamptz null | |
| error | text null | |

### 4.14 DailyNote (notas del día, como la referencia)

| Campo | Tipo | Notas |
| --- | --- | --- |
| company_id, branch_id | uuid | |
| date | date | |
| body | text | “Reunión de equipo a las 09:00” |

Nice-to-have del MVP si hay tiempo; no bloquea agenda.

### 4.15 Relaciones (resumen)

```
Company 1──* Branch
Company 1──* User
Company 1──* Professional 1──1 User
Professional *──* Branch          (ProfessionalBranch)
Professional 1──* WorkSchedule    (cada fila apunta a una Branch)
Company 1──* Service
Professional *──* Service         (ProfessionalService: precio + comisión)
Company 1──* Client
Appointment → Company, Branch, Professional, Client, Service
```

### 4.16 Lo que no modelamos en el MVP

- Recursos físicos (cabina, bac shampooing): aparecen en la referencia visual, van al roadmap.
- Servicio compuesto (Uñas 30 + Pestañas 30 = pack 45 min).
- Caja, parciales, cuentas corrientes.
- Multi-moneda dentro de la misma empresa.

---

## 5. Reglas de negocio

### 5.1 Alta de turno

1. Actor con permiso (Admin / Encargado / Recepción).
2. Sucursal: Admin elige; Encargado/Recepción = la suya.
3. Profesional: solo los asignados a esa sucursal **y** con horario ese weekday en esa sucursal.
4. Servicio: solo los `ProfessionalService.active` de ese profesional.
5. `duration_minutes` ← Service. `price` ← ProfessionalService.price. `end_at` ← start + duration.
6. `start_at` y `end_at` deben caer **dentro de un bloque** de `WorkSchedule` de ese profesional en esa sucursal y weekday (un turno puede cubrir varios slots visuales, no puede empezar antes de las 09:00 si el bloque es 09–18, ni terminar después de las 18:00).
7. No puede solaparse con otro turno del mismo profesional cuyo status **no** sea `CANCELADO`.
8. Cliente existente o alta nueva (con warning de teléfono).
9. Status inicial: `RESERVADO`. `paid = false` salvo que recepción lo marque en el mismo alta.
10. Encolar email `CREATED` si el cliente tiene email.

### 5.2 Edición de turno

- Se pueden cambiar fecha/hora, profesional, servicio, cliente, observaciones, pagado, estado (según transiciones).
- Si cambian profesional o servicio, se recalculan duración y precio **salvo** que el usuario haya editado el precio a mano (flag `price_overridden` opcional; en MVP se recalcula siempre al cambiar el servicio/profesional y se puede ajustar el monto después).
- Si cambia la ventana horaria: mismas validaciones de horario y solapamiento (el propio turno se excluye).
- Email `UPDATED` si cambian fecha, hora, profesional, servicio o sucursal.

### 5.3 Cancelación

- Transición a `CANCELADO`. No se elimina la fila.
- Se libera el hueco: los solapamientos ignoran `CANCELADO`.
- Email `CANCELLED`.
- `paid` no se toca automáticamente (si ya había cobrado, queda marcado; el reporte de “a pagar” no incluye cancelados).

### 5.4 Transiciones de estado

```
RESERVADO → CONFIRMADO | CANCELADO | NO_ASISTIO | ATENDIDO
CONFIRMADO → ATENDIDO | CANCELADO | NO_ASISTIO
ATENDIDO → (no vuelve atrás en MVP, salvo Admin corrigiendo a CONFIRMADO)
CANCELADO → no reabre; se crea un turno nuevo
NO_ASISTIO → Admin puede pasar a ATENDIDO si fue un error
```

### 5.5 Disponibilidad

Un instante T está libre para el profesional P en sucursal B si:

- existe WorkSchedule para P+B+weekday(T) con `is_off = false` y `start_time ≤ T < end_time` (y el intervalo completo del servicio cabe);
- no existe Appointment de P con status ≠ CANCELADO que intersecte `[start, end)`.

Admin puede ver huecos de todos. Profesional no consulta disponibilidad ajena.

### 5.6 Clientes y teléfono

- Búsqueda: teléfono (normalizado a dígitos) y nombre.
- Al crear, si `phone` ya existe en la empresa: la API devuelve `409` con la lista de coincidencias **o** un flag `forceCreate=true` + `duplicate_confirmed=true`.
- No se fusionan fichas en el MVP.

### 5.7 Remuneración (reporte)

Para cada turno `ATENDIDO` en el período:

```
si remuneration_type == PERCENT:
  a_pagar = price * (remuneration_value / 100)
si FIXED:
  a_pagar = remuneration_value
```

Se usa la comisión **actual** del ProfessionalService al momento del reporte, o un snapshot en el turno. **Decisión MVP:** snapshot de comisión en el turno al crearlo (`remuneration_type_snapshot`, `remuneration_value_snapshot`) para que un cambio de % no reescriba el pasado.

### 5.8 Profesional y sucursal

No se puede crear un turno en sucursal Norte un lunes si María ese lunes tiene horario solo en Centro. La sucursal del turno **debe** ser la del horario de ese día.

---

## 6. Pantallas

Shell común (referencia Studio Élégance, tema claro):

- **Marca** a la izquierda: logo + nombre de la empresa.
- **Nav principal:** Agenda · Clientes · Prestaciones · (Caja oculta en MVP) · Estadísticas/Reportes · Configuración (Admin).
- **Header:** sucursal activa (select si Admin), vista Día/Semana/Mes, campana (roadmap), usuario.
- Encargado/Recepción: sucursal fija, no selector global.
- Profesional: nav reducida (Agenda, y ficha de *sus* clientes vía turnos). No ve Prestaciones ni Reportes ni Config.

### 6.1 Agenda (pantalla principal)

Ver sección 9. Botón **+ Nuevo turno**. Click en un bloque abre el panel de detalle.

### 6.2 Detalle / alta de turno (panel o modal)

```
┌─────────────────────────────────┐
│ Juan Pérez                    X │
│ Uñas + Pestañas                 │
│ Miércoles 16 de septiembre      │
│ 14:00 – 14:45                   │
│ Profesional: María              │
│ Sucursal: Centro                │
│ Precio: $15.000                 │
│ ☑ Pagado                        │
│ Estado: CONFIRMADO              │
│ Tel: +54 9 …                    │
│ [Hablar por WhatsApp]           │
│ [Ver ficha]  [Editar] [Cancelar]│
└─────────────────────────────────┘
```

Alta: sucursal → profesional → servicio (duración/precio autocompletados) → fecha/hora → cliente (buscar o crear) → observaciones → guardar.

### 6.3 Clientes

Listado + búsqueda por teléfono y nombre. Ficha: datos, historial de turnos (los que el rol pueda ver), notas.

### 6.4 Prestaciones (servicios)

ABM de servicios. Desde cada servicio, o desde el profesional: matriz de precios y comisión por profesional.

### 6.5 Profesionales y horarios (Configuración)

ABM profesional, color, sucursales, servicios que realiza, grilla semanal (día → sucursal → desde/hasta / franco).

### 6.6 Sucursales y usuarios (Admin)

ABM sucursales. ABM usuarios con rol y alcance.

### 6.7 Reportes

Filtro desde / hasta / sucursal. Tabla:

| Persona | Turnos | Facturado | A pagar |
| --- | --- | --- | --- |

Detalle expandible por servicio (opcional MVP+). Export CSV simple si entra fácil.

### 6.8 Sidebar del día (si replica la referencia)

- Próximo turno / en curso.
- Cifras del día: cantidad de turnos, facturado (ATENDIDO+CONFIRMADO del día o solo ATENDIDO — **decisión:** turnos no cancelados del día para “Rendez-vous”; facturado = suma de `price` de no cancelados; panier moyen = facturado / cantidad; ocupación = minutos ocupados / minutos de horario).
- Notas del día.

Cifras del día son **informativas**; el reporte de profesionales es la fuente para “a pagar”.

---

## 7. API NestJS

Prefijo: `/api/v1`. JSON. Errores: `{ statusCode, error, message, details? }`.

### 7.1 Auth

| Método | Path | Roles | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/login` | público | `{ email, password, companySlug? }` → tokens |
| POST | `/auth/refresh` | | |
| POST | `/auth/logout` | | |
| GET | `/auth/me` | autenticado | usuario + empresa + branding |

### 7.2 Empresa y sucursales

| Método | Path | Roles |
| --- | --- | --- |
| GET | `/company` | autenticado (datos públicos de *su* empresa) |
| PATCH | `/company` | Admin |
| GET/POST | `/branches` | GET autenticado (filtrado); POST Admin |
| PATCH | `/branches/:id` | Admin |

### 7.3 Usuarios

| Método | Path | Roles |
| --- | --- | --- |
| GET/POST | `/users` | Admin |
| PATCH | `/users/:id` | Admin |
| POST | `/users/:id/deactivate` | Admin |

### 7.4 Profesionales, horarios, servicios

| Método | Path | Notas |
| --- | --- | --- |
| GET/POST `/professionals` | Admin escribe; GET según rol (profesional solo se ve a sí mismo) |
| PATCH `/professionals/:id` | Admin |
| PUT `/professionals/:id/branches` | Admin |
| GET/PUT `/professionals/:id/schedule` | Admin; GET también Encargado (su sucursal) |
| GET/POST `/services` | Admin escribe; GET staff |
| GET/PUT `/professionals/:id/services` | matriz precio + comisión |

### 7.5 Clientes

| Método | Path | Notas |
| --- | --- | --- |
| GET `/clients?query=` | búsqueda nombre/teléfono; Profesional: solo clientes con turno propio |
| POST `/clients` | `forceCreate` para duplicado |
| GET/PATCH `/clients/:id` | 404 si el rol no puede verlo |

### 7.6 Turnos

| Método | Path | Notas |
| --- | --- | --- |
| GET `/appointments` | query: `from`, `to`, `branchId`, `professionalId`, `status` — **el servidor recorta el alcance** |
| GET `/appointments/:id` | 404 si fuera de alcance (no 403, para no filtrar ids) |
| POST `/appointments` | alta |
| PATCH `/appointments/:id` | edición |
| POST `/appointments/:id/cancel` | estado CANCELADO |
| POST `/appointments/:id/status` | `{ status }` |
| POST `/appointments/:id/paid` | `{ paid: boolean }` |
| GET `/appointments/availability` | `professionalId`, `branchId`, `date`, `serviceId` → huecos |

**Recorte obligatorio en GET list:**

```
si PROFESIONAL: professionalId := token.professionalId   // ignore query
si ENCARGADO | RECEPCION: branchId := token.branchId
si ADMIN: honra filtros de query
+ siempre companyId := token.companyId
```

### 7.7 Reportes

| Método | Path | Roles |
| --- | --- | --- |
| GET `/reports/professionals?from&to&branchId` | Admin; Encargado solo su branch |
| GET `/reports/daily?date&branchId` | Admin, Encargado, Recepción (cifras del día) |

### 7.8 WhatsApp (no es un envío)

| Método | Path | Descripción |
| --- | --- | --- |
| GET `/appointments/:id/whatsapp-link` | Devuelve `{ url }` con `wa.me` + texto encodeado. El front abre pestaña. |

### 7.9 Contratos de autorización (tests)

Cada uno es un test e2e, no un “acordarse”:

1. Usuario empresa A no lee recursos de empresa B (ni por UUID adivinado).
2. Juan PROFESIONAL no lista turnos de Noelia.
3. Encargado Centro no lista turnos de sucursal Norte.
4. Recepción no accede a `/reports/professionals`.
5. Profesional recibe 403 en POST `/appointments`.

---

## 8. Frontend Next.js

- App Router, TypeScript, tema claro.
- Design tokens desde branding de la empresa (`primary_color`, logo).
- Estado servidor: React Query o equivalente contra la API.
- Calendario: **grilla propia** para vista Día (columnas = profesionales, filas = tiempo). FullCalendar se evalúa para Semana/Mes; no es obligatorio si la grilla propia cubre las tres vistas.
- i18n: español rioplatense en copy. Fechas con `Intl` + timezone de la empresa.
- El front **nunca** usa `professionalId` de un combo para un usuario PROFESIONAL: ni siquiera se renderiza el filtro.

Rutas aproximadas:

```
/login
/agenda                      vista principal
/clientes
/clientes/[id]
/prestaciones
/reportes
/config/empresa
/config/sucursales
/config/usuarios
/config/profesionales
/config/profesionales/[id]/horarios
```

Profesional: solo `/agenda` (+ detalle de turno y ficha limitada).

---

## 9. Agenda

Objetivo: la pantalla que más se usa. Debe sentirse como la referencia (columnas por persona, bloques de color, duración = altura).

### 9.1 Vista Día (default)

```
          LUNES 14 / o un solo día: “Viernes 16 de octubre”
          JUAN          MARÍA           NOELIA
09:00
       ┌──────────┐
       │  UÑAS    │
10:00  │ Cliente  │
       └──────────┘
11:00                    ┌─────────────┐
                         │ PESTAÑAS    │
12:00                    │ Juan Pérez  │
                         └─────────────┘
```

- Eje vertical: de min(inicios de horario del día) a max(fines), típico 09:00–19:00, slots de 15 o 30 min.
- Columnas: profesionales visibles (checkboxes a la izquierda para Admin/Encargado/Recepción). Profesional: **una** columna, la suya.
- Bloque: horario, nombre de servicio, nombre de cliente. Color = `professional.color`.
- Un servicio 10:30–12:00 ocupa exactamente esa altura.

### 9.2 Vista Semana

Filas = profesionales (los filtrados), columnas = L–D de la semana. Bloques compactos. Click abre el mismo panel.

### 9.3 Vista Mes

Calendario clásico con conteo o chips; click en un día salta a vista Día.

### 9.4 Selector

`[Día] [Semana] [Mes]` + flechas + “Hoy” + mini-calendario izquierdo.

### 9.5 Filtros izquierdos

- Mini calendario.
- Colaboradores (checkboxes) — oculto para rol Profesional.
- Recursos: **no en MVP** (la referencia los muestra; se deja el espacio mental para el roadmap).
- CTA **+ Nuevo turno**.

### 9.6 Interacción

- Click en hueco: abre alta con profesional, sucursal y hora prellenados.
- Click en bloque: detalle.
- Drag & drop de reprogramación: **roadmap**. En MVP se edita por formulario.

---

## 10. Reportes

No es una liquidación contable. Es un reporte operativo.

```
REPORTE DE PROFESIONALES
Desde: 01/09/2026    Hasta: 15/09/2026
Sucursal: (todas | Centro | Norte)

┌──────────┬────────┬───────────┬────────────┐
│ Persona  │ Turnos │ Facturado │ A pagar    │
├──────────┼────────┼───────────┼────────────┤
│ María    │ 35     │ $750.000  │ $300.000   │
│ Juan     │ 28     │ $540.000  │ $216.000   │
│ Noelia   │ 42     │ $820.000  │ $410.000   │
└──────────┴────────┴────────────┴────────────┘
```

**Definiciones MVP**

| Columna | Cálculo |
| --- | --- |
| Turnos | cantidad de appointments `ATENDIDO` con `start_at` en el rango |
| Facturado | `sum(price)` de esos turnos |
| A pagar | `sum` de comisión snapshot de esos turnos |

Cancelados y no asistió **no** entran. `paid` no filtra el reporte (se cobró o no es un tema de caja, no de “a pagar” al profesional, salvo que más adelante se agregue un filtro).

Cifras del día (sidebar): ver 6.8.

---

## 11. Emails y WhatsApp

### 11.1 WhatsApp (MVP)

Botón **Hablar por WhatsApp**. Abre WhatsApp Web/App:

`https://wa.me/{digitosCliente}?text={urlencoded}`

Plantilla:

```
Hola {nombreCliente},

Te contactamos de {empresa.nombre}.

Recordatorio de tu turno:

📅 {fechaLarga}
🕐 {hora} hs
💅 {servicio}
👩 Profesional: {profesional}
📍 Sucursal {sucursal}

¡Te esperamos!
```

Sin API de Meta. Sin envío automático. Sin plantillas HSM.

### 11.2 Email (MVP)

Asíncrono. Requiere `client.email`.

| Evento | Asunto (copy base) |
| --- | --- |
| Alta | Tu turno fue reservado |
| Modificación material | Tu turno fue modificado |
| Cancelación | Tu turno fue cancelado |

Cuerpo: mismos datos que WhatsApp (fecha, hora, servicio, profesional, sucursal, nombre de empresa). Remitente: `company.contact_email` vía proveedor.

**Recordatorio 24 h antes:** el job type `REMINDER_24H` existe en el modelo; el scheduler **no** se implementa en el MVP.

---

## 12. Seguridad multiempresa

### 12.1 Amenazas que nos importan

1. Usuario de A llama `GET /appointments/:uuid-de-B`.
2. Profesional altera query string.
3. Encargado manda `branchId` de otra sucursal.
4. `companyId` en el body de un POST.
5. IDs enumerables (por eso UUID y 404 en vez de 403 en gets por id).

### 12.2 Controles

- `TenantGuard`: `entity.companyId === req.user.companyId` en **cada** repositorio. Un mixin/base repository, no “acordarse en cada controller”.
- El DTO de create **no incluye** `companyId`.
- `RbacGuard` + decoradores `@Roles()` + `@Scope('branch'|'self')`.
- Tests e2e de la sección 7.9 en CI.
- Passwords con Argon2/bcrypt. Rate limit en login.
- Headers de seguridad básicos en Next y Nest.
- Logs de authz deny (sin PII excesiva).

### 12.3 Datos del tenant

Empresa A y B pueden ambas usar ARS y timezone Argentina, con logo y colores distintos. Eso no las une: el aislamiento es por id, no por moneda.

---

## 13. MVP

Orden de construcción (no se salta a la agenda sin tenant + auth):

1. Monorepo, Postgres, Company + User Admin seed.
2. Login, TenantGuard, branding mínimo.
3. Sucursales, profesionales, N:N sucursal, horarios.
4. Servicios + ProfessionalService (precio y comisión).
5. Clientes + warning duplicado.
6. Turnos: CRUD, estados, paid, conflictos, snapshots.
7. Autorización por rol (tests de Juan vs Noelia).
8. Agenda Día + Semana + selector Mes básico.
9. Panel de turno + WhatsApp link.
10. Emails create/update/cancel (cola).
11. Reporte de profesionales + cifras del día.
12. Configuración (usuarios, empresa).

**Criterio de “se puede usar”:** una empresa real con 1–2 sucursales, 3 profesionales, recepción cargando turnos del día, profesional logueado viendo solo lo suyo, dueño bajando el reporte quincenal.

**Fuera del MVP (explícito):** ver §14.

---

## 14. Roadmap futuro

| Ítem | Por qué espera |
| --- | --- |
| Servicio compuesto (pack con ítems) | El servicio plano cubre “Uñas + Pestañas” |
| Recursos / cabinas | Complejidad extra de conflicto espacial |
| Caja, parciales, medios de pago, cuentas corrientes | `paid` alcanza; tabla Payment ya pensada |
| WhatsApp Business API / recordatorios proactivos | Botón wa.me cubre el contacto humano |
| Recordatorio email 24 h | Job type ya modelado |
| Estados EN_ESPERA, REPROGRAMADO | Cancelar+crear o editar fecha alcanza |
| Reserva pública / link para el cliente | Otro actor, otra superficie de abuso |
| Dominios custom + emails white-label DNS | slug alcanza para empezar |
| Drag & drop en agenda | Formulario es suficiente |
| App móvil nativa | Web responsive primero |
| Excepciones de horario (vacaciones) | Tabla prevista |
| Multi-idioma UI | Copy en español |
| Liquidación contable / AFIP | Nunca el objetivo de este producto |
| Notificaciones in-app | Campana de la referencia |

---

## 15. Tarjetas de Trello

Tablero dedicado **[Turnero — Agenda SaaS](https://trello.com/b/QdSMqCWX/turnero-agenda-saas)** en el workspace SIEMPRE (no mezclar con marketplace ni tickets de otro producto). Índice con URLs de cada tarjeta: [TRELLO.md](TRELLO.md).

Listas:

| Lista | Uso |
| --- | --- |
| Documento maestro | Fuente de verdad y este archivo |
| Decisiones cerradas | A–H, inmutables salvo migración |
| Épicas | Correspondencia con las secciones 1–14 |
| Backlog MVP | 25 historias espina, orden de construcción |
| Detalle MVP | Historias atómicas (infra, dominio, pantallas, mails, seguridad) |
| Roadmap | Explicitamente post-MVP y won't-do |

Cada tarjeta de backlog incluye: contexto, objetivo, alcance, impacto en modelo, API, permisos, criterios de aceptación, fuera de alcance y dependencia. El detalle largo vive aquí; Trello lleva el resumen operativo (límite de descripción) más checklist de aceptación.

IDs estables:

### Documento

- `DOC-000` Documento maestro del producto

### Decisiones

- `DEC-A` Profesional multi-sucursal
- `DEC-B` Servicios por profesional
- `DEC-C` Horario = profesional + sucursal + día
- `DEC-D` Cancelar no borra
- `DEC-E` Agenda Día / Semana / Mes
- `DEC-F` Turnos que ocupan varias horas
- `DEC-G` Teléfono con warning, no unique
- `DEC-H` Tenant isolation desde día 1

### Épicas

- `EP-01` Visión y posicionamiento
- `EP-02` Roles y permisos
- `EP-03` Arquitectura
- `EP-04` Modelo de datos
- `EP-05` Reglas de negocio
- `EP-06` Pantallas
- `EP-07` API NestJS
- `EP-08` Frontend Next.js
- `EP-09` Agenda
- `EP-10` Reportes
- `EP-11` Emails y WhatsApp
- `EP-12` Seguridad multiempresa
- `EP-13` Corte MVP
- `EP-14` Roadmap futuro

### Backlog MVP (implementación)

- `INF-001` Monorepo NestJS + Next.js + Postgres
- `TEN-001` Company, branding, timezone, currency
- `AUTH-001` Login JWT + `/me`
- `AUTH-002` RBAC (4 roles) + alcance sucursal
- `AUTH-003` Aislamiento de profesional en backend (Juan ≠ Noelia)
- `BRN-001` Sucursales
- `USR-001` ABM usuarios
- `PRO-001` Profesionales + asignación a sucursales
- `PRO-002` Horarios semanales por profesional y sucursal
- `SVC-001` Catálogo de servicios
- `SVC-002` Precio y comisión por profesional × servicio
- `CLI-001` Clientes y duplicado de teléfono
- `APT-001` Turnos: modelo, estados, snapshots, paid
- `APT-002` Alta/edición con validación de horario y solapamiento
- `APT-003` Cancelación histórica (nunca delete)
- `AVL-001` Disponibilidad / huecos
- `UI-001` Shell, nav por rol, branding
- `UI-002` Agenda Día (columnas por profesional)
- `UI-003` Agenda Semana y Mes + selector
- `UI-004` Panel de turno + WhatsApp
- `UI-005` Pantallas clientes, prestaciones, config
- `RPT-001` Reporte de profesionales
- `RPT-002` Cifras del día
- `NTF-001` Cola de email created/updated/cancelled
- `SEC-001` Tests e2e de tenant y RBAC

### Detalle MVP (ver docs/TRELLO.md)

Infra `INF-002`…`INF-007`. Tenant `TEN-002`…`TEN-005`. Auth `AUTH-004`…`AUTH-008`. Usuarios `USR-002`…`USR-004`. Sucursal `BRN-002`. Profesionales `PRO-003` `PRO-004`. Servicios `SVC-003` `SVC-004`. Clientes `CLI-002`…`CLI-004`. Turnos `APT-004`…`APT-008`. `PAY-001` `NOTE-001`. UI `UI-006`…`UI-023`. Emails `NTF-002`…`NTF-006`. Reportes `RPT-003`…`RPT-005`. Seguridad `SEC-002`…`SEC-005`.

### Roadmap

- `FUT-001` Servicios compuestos
- `FUT-002` Recursos / cabinas
- `FUT-003` Caja y pagos parciales
- `FUT-004` WhatsApp API
- `FUT-005` Recordatorio 24 h
- `FUT-006` Reserva online
- `FUT-007` Dominios custom
- `FUT-008` Drag & drop
- `FUT-009` Estados EN_ESPERA / REPROGRAMADO
- `FUT-010` App nativa
- `FUT-011` Multi-idioma
- `FUT-012` Campana in-app
- `FUT-013` Export CSV
- `FUT-014` NO: liquidación AFIP
- `FUT-015` Excepciones de horario / vacaciones

---

## Apéndice A — Ejemplo de resolución de precio

María elige Uñas + Pestañas:

1. `Service.duration_minutes = 45`
2. `ProfessionalService.price = 20000` (María)
3. Turno: `14:00` → `14:45`, `price = 20000`
4. Comisión snapshot: 40% → `a_pagar` futuro = 8000 cuando esté `ATENDIDO`

No hay motor de reglas ni packs.

## Apéndice B — Copy WhatsApp / email

Ver §11. Variables: `nombreCliente`, `empresa.nombre`, `fechaLarga`, `hora`, `servicio`, `profesional`, `sucursal`.

## Apéndice C — Semilla de desarrollo

Empresa “Studio Élégance”, timezone `America/Argentina/Buenos_Aires`, ARS. Sucursal Centro. Profesionales Juan, María, Noelia. Servicios Uñas, Pestañas, Uñas + Pestañas. Un admin, una recepción, los tres profesionales como usuarios. Turnos de un viernes de ejemplo para probar la grilla.

---

*Fin del documento maestro. Cualquier PR de código del MVP debe poder trazarse a una tarjeta `INF|TEN|AUTH|…` y a una sección de este archivo.*
