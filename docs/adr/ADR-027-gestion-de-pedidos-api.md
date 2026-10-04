# ADR-027: API de gestion de pedidos (listados, transiciones de status, revision y detalle de pago)

**Estado:** Aceptado
**Fecha:** 2026-10-03
**Relacionado:** ADR-006 (esquema de orders), ADR-021 (rango serves_min/serves_max),
ADR-023 (needsReview), ADR-024 (Checkout Pro), ADR-026 (WhatsApp)

## Contexto

El backend ya creaba pedidos (`POST /orders`, tool MCP `crear_pedido`) y
procesaba pagos (ADR-024), pero no habia forma de *gestionarlos*: ni el
cliente podia listar sus pedidos ("Mis pedidos" en mobile), ni el staff
podia listarlos, filtrarlos, cambiarles el status o resolver los marcados
`needsReview` desde el dashboard. `OrdersService.updateStatus` aceptaba
cualquier status desde cualquier otro, y el webhook de Mercado Pago no
guardaba nada del pago mas alla del cambio de status.

Ademas, los controllers devolvian la entidad TypeORM tal cual: los
`numeric` de Postgres salian como string (shared-types los declara
`number`) y cargar relaciones como `customer` habria serializado
`users.password_hash`.

## Decision

### Endpoints nuevos

| Endpoint | Quien | Para que |
|---|---|---|
| `GET /orders/mine` | cualquier usuario autenticado | "Mis pedidos" (mobile). El cliente sale del JWT, nunca de la query. Filtro opcional `status`, paginado, mas recientes primero. |
| `GET /orders` | staff/admin/superadmin | Lista del dashboard. Filtros: `from`/`to` (fecha del evento, `scheduledFor`), `status` (uno o varios, separados por coma), `needsReview`, `createdSince`. Orden: `sort=scheduledFor\|createdAt`, `direction=asc\|desc`. Paginado (`page`, `pageSize` <= 100). |
| `PATCH /orders/:id/status` | staff/admin/superadmin | Cambio manual de status, validado contra la tabla de transiciones. |
| `PATCH /orders/:id/review` | staff/admin/superadmin | Resolver un pedido `needsReview`. |

Todas las respuestas de orders pasan por un mapper explicito
(`order-response.mapper.ts`): numericos como `number`, lineas con
`menuItemName`, y `customer` reducido a `{ id, fullName, email, phone,
whatsappNumber }`. La respuesta paginada es `Paginated<T>` (`items`,
`total`, `page`, `pageSize`). Los tipos viven en
`libs/shared-types/src/api/`.

### Tabla de transiciones de status

Fuente unica: `ORDER_STATUS_TRANSITIONS` en shared-types (la usa la API
para validar y el dashboard para decidir que botones mostrar).

| Desde | Hacia |
|---|---|
| `pending` | `confirmed`, `payment_failed`, `cancelled` |
| `payment_failed` | `pending`, `confirmed`, `cancelled` |
| `confirmed` | `preparing`, `cancelled` |
| `preparing` | `delivered`, `cancelled` |
| `delivered` | (final) |
| `cancelled` | (final) |

- Una transicion invalida responde **409 Conflict**.
- Pasar al mismo status que ya tiene es un **no-op** (no guarda ni reenvia
  WhatsApp): Mercado Pago reenvia webhooks y un duplicado no debe volver a
  notificar al cliente (ADR-026).
- El staff solo puede poner a mano `confirmed`, `preparing`, `delivered` y
  `cancelled`. `pending -> confirmed` manual cubre pagos por transferencia
  o en efectivo, sin pasar por Mercado Pago.
- `payment_failed` solo lo pone el webhook. `payment_failed -> pending` lo
  hace `POST /payments/preferences` al reintentar el pago (genera una
  preferencia nueva).

### Revision de pedidos fuera de rango (`needsReview`)

`PATCH /orders/:id/review` con `action`:

- `approve`: se acepta tal cual, `needsReview = false`.
- `reject`: se cancela (`status = cancelled`, via la tabla de
  transiciones) y `needsReview = false`.
- `adjust`: se corrigen `peopleCount` y/o `notes`, y `needsReview` se
  recalcula con la misma regla que `createOrder` (dentro del rango de al
  menos uno de los platillos pedidos). Si sigue fuera de rango, la marca
  se queda.

Solo aplica a pedidos con `needsReview = true` y en estado no final (si
no, 409). `peopleCount`/`notes` con `approve`/`reject` es 400. **Cambiar
platillos queda fuera a proposito**: implicaria recalcular totales y
snapshots de precio; en ese caso se cancela y el cliente pide de nuevo.

### Detalle del pago

Migracion `AddPaymentDetailsToOrders1752537600008`: `orders.payment_id`,
`orders.payment_method` (`payment_method_id` de Mercado Pago: visa, oxxo,
spei...) y `orders.paid_at` (`date_approved`). Se llenan en
`OrdersService.recordPaymentResult`, siempre con datos de la
**re-consulta** del pago (ADR-024), nunca del payload del webhook.

`recordPaymentResult` no lanza por una transicion invalida (ej. un pago
aprobado que llega despues de que el staff cancelo el pedido): guarda el
detalle del pago, deja el status como esta y registra un warning. Si
lanzara, el webhook responderia error y Mercado Pago lo reintentaria
indefinidamente; asi, el staff ve el pago en el detalle y decide (ej.
reembolso).

### Campanita del dashboard (version actual)

No existe todavia una tabla `notifications` (ADR-006 la define, pero no
esta implementada). La campanita carga lo llegado mientras el dashboard
estaba cerrado con `GET /orders?createdSince=<lastSeenAt>`, guardando
`lastSeenAt` en `localStorage`. Se agrega `IDX_orders_created_at` para
este filtro y para ordenar por fecha de creacion.

## Justificacion

- Reutiliza `OrdersService` como unico punto de logica de pedidos (mismo
  principio que ADR-023): el PATCH de staff, el webhook y la revision
  pasan todos por `updateStatus` y su tabla de transiciones.
- Tabla de transiciones compartida en shared-types en vez de duplicada en
  API y dashboard: una sola fuente de verdad.
- El mapper explicito fija el contrato y evita filtrar campos sensibles
  al cargar relaciones.
- `localStorage` + `createdSince` resuelve la campanita sin adelantar una
  tabla `notifications` que todavia no tiene otros consumidores.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| Un solo `PATCH /orders/:id` generico (status, peopleCount, notas...) | Mezcla reglas distintas (transiciones vs. revision) en un endpoint; mas facil equivocarse en permisos y validaciones |
| Permitir cambiar platillos en `adjust` | Recalcular totales y snapshots de precio sobre un pedido existente (posiblemente ya pagado) es mucho mas riesgoso; cancelar y volver a pedir es explicito |
| Guardar `lastSeenAt` en el servidor (por usuario) | Requiere tabla o columna nueva solo para esto; `localStorage` basta para esta version (un staff por navegador) |
| Rechazar en el webhook las transiciones invalidas | Mercado Pago reintentaria el webhook indefinidamente y el pago quedaria sin registrar |

## Consecuencias

- `GET /orders/:id` ahora responde 400 si el id no es UUID (antes llegaba
  a Postgres).
- Las respuestas de orders cambian de forma compatible: numericos como
  `number` (antes string), y campos nuevos `customer`, `paymentId`,
  `paymentMethod`, `paidAt`, `items[].menuItemName`.
- Cuando exista la tabla `notifications`, la campanita puede migrar a
  ella sin cambiar el resto del contrato.
