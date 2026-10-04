# Arquitectura — App de Catering

Este documento es la fuente de verdad de arquitectura para humanos y agentes
de IA trabajando en este repositorio. Los ADRs en `docs/adr/` documentan el
razonamiento detrás de cada decisión; este archivo da el panorama consolidado.

## Qué es esta app

Plataforma para un negocio de catering: los clientes hacen pedidos de
desayunos/comidas/cenas desde una app móvil, y el negocio (los "hermanos")
gestiona menú, precios y pedidos desde un dashboard web. Es a la vez un
producto real para un negocio con clientes activos y una pieza de portafolio
enfocada en arquitectura agent-native (MCP).

## Alcance de la versión alfa

- Catálogo de menú (desayuno/comida/cena, precios editables).
- Pedidos desde la app móvil.
- Dashboard con vista de pedidos y gestión de precios.
- Autenticación de usuarios.
- Notificación por WhatsApp a los hermanos cuando llega un pedido.
- Notificación por WhatsApp al cliente con PDF de su compra.
- Página de super usuario: historial de clientes, gasto total, generación de
  PDF con clientes de la semana/mes.
- Chatbot de soporte en la app, usando MCP para consultar pedidos.

Fuera de alcance del alfa (futuro): promociones, otros canales de pago,
más tools MCP (reportes automáticos). Crear pedidos vía agente ya existe
(tool `crear_pedido`, ADR-023).

## Stack

| Capa | Tecnología | ADR |
|---|---|---|
| Base de datos | PostgreSQL (Supabase, solo hosting — no auth) | ADR-001, ADR-010 |
| Backend | NestJS (REST + WebSocket Gateway + servidor MCP) | ADR-002, ADR-004 |
| Autenticación | NestJS propio (bcrypt/argon2 + JWT), no Supabase Auth | ADR-010 |
| UI móvil | React Native (Expo) + UI Kitten + Moti (animaciones) | ADR-008, ADR-011 |
| UI dashboard | Angular ~21.0.9 + Taiga UI | ADR-009 (pin de Angular), ADR-012 |
| Tiempo real | WebSockets (Socket.io) puntual, no GraphQL | ADR-004 |
| Monorepo | Nx | ADR-005 |
| Generación de PDF | pdfkit, dentro de un `PdfModule` del backend NestJS — **pendiente** (rama `feat/storage-images-receipts`) | ADR-007 |
| Notificaciones | WhatsApp vía Twilio (`WhatsAppService`) + WebSocket al dashboard | ADR-007, ADR-026 |
| Pagos | Mercado Pago Checkout Pro | ADR-022, ADR-024 |
| ORM | TypeORM | ADR-007 |
| Estado (React Native) | Zustand (cliente) | ADR-007 |
| Cliente HTTP (React Native) | axios | ADR-007 |
| Auditoría de dependencias | Snyk (integrado en CI) | ADR-007 |
| Gestor de paquetes | pnpm (único, confirmado en todo el monorepo) | ADR-007 |
| CI/CD | GitHub Actions | — |
| Tests | Jest (unitarias e integración) + Cypress (E2E dashboard) | ADR-007 |
| Deploy | GCP Cloud Run (API) + Firebase Hosting (dashboard) — confirmado, mismo patrón del proyecto anterior | — |

> **Nota sobre PrimeNG y gluestack-ui:** ADR-003 (UI original) y ADR-009
> (pin de licencia de PrimeNG) permanecen en `docs/adr/` sin editar, como
> registro histórico de decisiones reales que se tomaron y luego se
> revirtieron. La referencia vigente para UI es **ADR-011** (mobile) y
> **ADR-012** (dashboard).

## Estructura del monorepo (Nx)

```
apps/
  dashboard/     # Angular + Taiga UI — panel de operación y super usuario
  mobile/        # React Native (Expo) + UI Kitten + Moti — app de clientes
  api/           # NestJS: REST API + WebSocket Gateway + servidor MCP + PdfModule + AuthModule
libs/
  shared-types/  # DTOs e interfaces TypeScript compartidas entre apps
docs/
  adr/           # Decisiones de arquitectura (ADR-001 a ADR-012 y siguientes)
  ARCHITECTURE.md
  database-design.pdf
```

## Base de datos

Ver ADR-006 y `docs/database-design.pdf` para el diagrama ER completo.

Tablas definidas en ADR-006: `roles`, `users`, `menu_categories`,
`menu_items`, `menu_item_price_history`, `orders`, `order_items`,
`order_documents`, `notifications`, `mcp_tool_logs`.

**Implementadas hoy** (migraciones en `apps/api/src/database/migrations/`):
`roles`, `users`, `menu_categories`, `menu_items`,
`menu_item_price_history`, `orders`, `order_items`, `mcp_tool_logs`.

**Pendientes:** `order_documents` (llega con el recibo PDF y el
almacenamiento en Supabase Storage, rama `feat/storage-images-receipts`) y
`notifications` (hoy los envíos de WhatsApp solo quedan en los logs de la
API). Existen como tipos en `libs/shared-types`, pero no como entidades ni
tablas.

Principios de diseño: UUID como PK, soft deletes en `users`, snapshots de
precio en `order_items` para reportes históricamente correctos, JSONB para
atributos flexibles de menú, auditoría separada en tablas dedicadas
(precios, notificaciones, invocaciones MCP).

Columnas agregadas a `orders` después de ADR-006: `needs_review`
(ADR-023), `payment_preference_id` (ADR-024), y `payment_id`,
`payment_method`, `paid_at` (ADR-027).

## Servidor MCP (`apps/api`)

Ver ADR-002. El backend expone un servidor MCP con recursos (`MenuItems`,
`Orders`, `Users`) y tools invocables por agentes. Primer cliente: chatbot
de soporte embebido en la app.

Tools: `consultar_pedidos_por_cliente` y `crear_pedido` (ADR-023). En
ambas el cliente sale del JWT, nunca del input.

Toda invocación queda registrada en `mcp_tool_logs` (tool, quién invocó,
parámetros, resultado, timestamp).

## Flujo de pedido (end-to-end)

```
1. Cliente arma pedido en la app móvil (React Native) o por chat (MCP crear_pedido)
2. POST /orders en la API NestJS
3. API valida contra menu_items, calcula totales, guarda en Postgres
   (orders + order_items con snapshot de precio). Si peopleCount queda
   fuera del rango serves_min/serves_max de todos los platillos, se crea
   igual con needsReview = true (ADR-023). scheduledFor debe ser futura
   (400 si no): misma regla para POST /orders y la tool MCP crear_pedido
   (`orders/scheduled-for.validation.ts`)
4. API emite evento WebSocket `new-order` → dashboard Angular lo refleja en vivo
5. WhatsApp (Twilio) al negocio y al cliente (ADR-026) — solo texto por ahora
6. Pago: POST /payments/preferences → Checkout Pro → webhook re-consulta
   el pago, guarda su detalle y mueve el status (ADR-024, ADR-027)
7. Staff gestiona el pedido desde el dashboard: status y revisión (ADR-027)
```

**Pendiente** (rama `feat/storage-images-receipts`): el `PdfModule` que
genera el recibo, guardado en Supabase Storage y registrado en
`order_documents`; el WhatsApp al cliente pasará a adjuntar su URL.
Tampoco existe todavía la tabla `notifications`.

## Gestión de pedidos (ADR-027)

- `GET /orders/mine` (cliente, sus propios pedidos) y `GET /orders`
  (staff/admin/superadmin: filtros por fecha del evento, status,
  needsReview y createdSince, ordenable, paginado).
- `PATCH /orders/:id/status` valida la tabla de transiciones
  `ORDER_STATUS_TRANSITIONS` (shared-types): `delivered` y `cancelled` son
  finales; `pending → confirmed` manual cubre transferencia/efectivo.
- `PATCH /orders/:id/review`: approve / reject / adjust (peopleCount y
  notas) para pedidos `needsReview`.
- Todas las respuestas pasan por `order-response.mapper.ts` (numéricos
  como number, nombre del platillo por línea, cliente resumido).
- Campanita del dashboard: `GET /orders?createdSince=<lastSeenAt>`, con
  `lastSeenAt` en `localStorage`.

## Pagos (ADR-022, ADR-024)

Checkout Pro: la API crea la preferencia (`POST /payments/preferences`) y
valida el webhook por firma, re-consultando siempre el pago real. Las
`back_urls` apuntan a la API (`GET /payments/return/:result`), que redirige
al deep link de la app (addendum 01 de ADR-024, con instrucciones de
prueba en local para iOS y Android).

## Estado actual

- `apps/api`: `auth`, `menu`, `orders` (creación, listados, status,
  revisión), `payments` (Checkout Pro + webhook), `mcp` (2 tools),
  `notifications` (WebSocket gateway + WhatsApp). Sin `PdfModule` todavía.
- `apps/dashboard`: features `auth`, `menu`, `notifications` (campanita).
  Gestión de pedidos en curso (`feat/order-flow`).
- `apps/mobile`: features `auth`, `menu`, `chat`, `session`, `theme`,
  `navigation`, `cart` (carrito persistido en AsyncStorage + checkout que
  crea un pedido con todos los platillos, con aviso de rango
  serves_min/serves_max) y `orders` (data-access). Pago y "Mis pedidos" en
  curso (`feat/order-flow`).
- `libs/shared-types`: enums, entidades, evento WebSocket y contratos de
  API (`src/api/`: paginación, orders, payments).
- Lint: solo `dashboard` tiene target de lint en Nx; `api` y `mobile` no
  (el CI no los lintea todavía).

## Proceso de trabajo del equipo

1. **ADRs antes de código** — cualquier decisión de arquitectura se documenta
   en `docs/adr/` antes de implementarse. Un ADR aceptado nunca se edita:
   una decisión nueva que lo reemplaza se documenta como un ADR adicional
   (ver nota sobre ADR-003/ADR-009 arriba).
2. **`ARCHITECTURE.md` como contexto para agentes** — este archivo, a
   diferencia de los ADRs, sí se actualiza libremente para reflejar el
   estado vigente del proyecto.
3. **Tests junto con el código** — no se agrega código sin su test
   correspondiente (unitario como mínimo).
4. **Claude Code / agentes de código para tareas complejas, git manual
   para commits simples.**
5. **Ingeniería de calidad, no vibe coding** — cada decisión técnica tiene
   una justificación explícita, no solo "porque funciona".

## Pendientes de decisión (no bloquean el arranque)

- **Herramienta de E2E para React Native**: se evaluará (ej. Detox) cuando
  el proyecto llegue a esa fase.
