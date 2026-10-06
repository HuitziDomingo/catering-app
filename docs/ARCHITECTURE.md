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
| Generación de PDF | pdfkit, dentro del `PdfModule` del backend NestJS (recibo del pedido) | ADR-007, ADR-028 (+ addendum 01) |
| Notificaciones | WhatsApp vía Twilio (`WhatsAppService`) + WebSocket al dashboard | ADR-007, ADR-026 |
| Pagos | Mercado Pago Checkout Pro | ADR-022, ADR-024 |
| Almacenamiento de archivos | Supabase Storage (S3) en producción, SeaweedFS en desarrollo; procesado de imágenes con sharp | ADR-028 |
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
  api/           # NestJS: REST API + WebSocket Gateway + servidor MCP + AuthModule + StorageModule + PdfModule
  landing/       # Astro + Pico.css — página pública
libs/
  shared-types/  # DTOs e interfaces TypeScript compartidas entre apps
docs/
  adr/           # Decisiones de arquitectura (ADR-001 a ADR-012 y siguientes)
  ARCHITECTURE.md
  architecture-diagram.html        # diagrama interactivo, generado con archify
  architecture.architecture.json   # fuente del diagrama (se edita esto y se regenera)
  database-design.pdf
```

El diagrama de `docs/architecture-diagram.html` se genera desde
`docs/architecture.architecture.json` con la skill archify
(`.claude/skills/archify`). Si un cambio altera la arquitectura, se
actualiza el JSON y se regenera el HTML (ver `Claude.md`).

## Base de datos

Ver ADR-006 y `docs/database-design.pdf` para el diagrama ER completo.

Tablas definidas en ADR-006: `roles`, `users`, `menu_categories`,
`menu_items`, `menu_item_price_history`, `orders`, `order_items`,
`order_documents`, `notifications`, `mcp_tool_logs`.

**Implementadas hoy** (migraciones en `apps/api/src/database/migrations/`):
`roles`, `users`, `menu_categories`, `menu_items`,
`menu_item_price_history`, `orders`, `order_items`, `order_documents`,
`mcp_tool_logs`.

`order_documents` guarda la llave del objeto en el bucket privado
(`storage_key`), no una URL (ADR-028 y su addendum 01); un índice único
parcial garantiza un recibo por pedido.

**Pendiente:** `notifications` (hoy los envíos de WhatsApp solo quedan en
los logs de la API). Existe como tipo en `libs/shared-types`, pero no como
entidad ni tabla.

Principios de diseño: UUID como PK, soft deletes en `users`, snapshots de
precio en `order_items` para reportes históricamente correctos, JSONB para
atributos flexibles de menú, auditoría separada en tablas dedicadas
(precios, notificaciones, invocaciones MCP).

Columnas agregadas a `orders` después de ADR-006: `needs_review`
(ADR-023), `payment_preference_id` (ADR-024), y `payment_id`,
`payment_method`, `paid_at` (ADR-027).

`menu_items.image_url` (ADR-006) se renombró a `image_key` (ADR-028): la
base guarda la llave del objeto y la API arma la URL pública en cada
respuesta.

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
7. Al pasar a confirmed (webhook o confirmación manual) se genera el
   recibo PDF y se guarda en el bucket privado (ADR-028)
8. Staff gestiona el pedido desde el dashboard: status y revisión (ADR-027)
```

**Pendiente:** el WhatsApp al cliente todavía no adjunta la URL del
recibo, y no existe la tabla `notifications`.

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
- Dashboard (`features/orders/`): lista `/orders` con filtros, orden y
  paginación (se refresca con `new-order`), y detalle `/orders/:id` con
  cambio de status y revisión. Un pedido `cancelled` con `paidAt` se marca
  "Pagado: reembolsar" en lista y detalle: el reembolso es manual en
  Mercado Pago.

## Almacenamiento e imágenes del menú (ADR-028)

- `StorageModule` (`apps/api/src/storage/`): puerto `StorageService`
  (`putObject`, `deleteObject`, `getPublicUrl`, `getSignedUrl`) con un
  adaptador S3. En local habla con SeaweedFS (`docker compose up -d`,
  puerto 8333); en producción con el endpoint S3 de Supabase Storage.
- Buckets: `menu-images` (lectura pública) y `order-documents` (privado,
  URLs firmadas: los recibos PDF).
- Dos URLs configurables: `STORAGE_ENDPOINT` (lo que usa la API) y
  `STORAGE_PUBLIC_URL` (lo que reciben dashboard y app). Para probar en
  simulador, emulador o teléfono físico, ver la tabla de ADR-028 y
  `apps/api/.env.example`.
- `POST /menu/items/:id/image` (multipart, campo `image`, máx. 5 MB) y
  `DELETE /menu/items/:id/image`, solo staff/admin/superadmin. sharp valida
  el formato por contenido (jpg/png/webp), aplica la orientación EXIF,
  quita metadatos y guarda webp de máx. 1200 px. Cada subida usa una llave
  nueva y se borra la anterior.
- La única forma de poner una imagen es subirla: `imageUrl` ya no se
  acepta en `POST /menu/items` ni `PATCH /menu/items/:id`. Las respuestas
  de menú pasan por `menu/menu-item-response.mapper.ts` (arma `imageUrl`,
  `basePrice` como number).
- Las líneas de pedido traen `menuItemImageUrl` (imagen vigente del
  platillo; `null` si no tiene o está dado de baja), para las miniaturas
  de "Mis pedidos".
- Móvil: `core/ui/DishImage` (expo-image, caché en memoria y disco,
  fundido al cargar, placeholder sin imagen o si falla) en menú, detalle,
  carrito y "Mis pedidos". El carrito resuelve la imagen desde el menú
  cargado por `menuItemId`; la URL guardada en la línea es solo respaldo,
  porque al reemplazar una imagen la API borra el objeto viejo.

## Recibo PDF (ADR-028 + addendum 01)

- `PdfModule` (`apps/api/src/pdf/`): `receipt-content.ts` arma el texto
  del recibo (negocio, folio, cliente, platillos, total, pago, leyenda "no
  es un comprobante fiscal (CFDI)") y `ReceiptPdfRenderer` lo dibuja con
  pdfkit. `ReceiptsService` lo sube a `order-documents`
  (`receipts/<orderId>/<uuid>.pdf`, `Cache-Control: private, no-store`) y
  lo registra en `order_documents`.
- Se genera al pasar el pedido a `confirmed` (`OrdersService.updateStatus`,
  así que cubre el webhook y la confirmación manual). Es idempotente y su
  fallo solo se registra: no revierte la confirmación ni hace fallar el
  webhook.
- `GET /orders/:id/receipt` → `{ url, expiresAt }`, URL firmada de 15
  minutos. Dueño o staff/admin/superadmin (otro cliente: 403); si el pedido
  está pagado (`isOrderPaid` de shared-types) y no tiene recibo, lo genera
  al vuelo; sin pago, 409.
- Datos del negocio por variables `BUSINESS_*` (`apps/api/.env.example`).
- Dashboard: botón "Ver o descargar recibo (PDF)" en el detalle, abre la
  URL en otra pestaña. Móvil: "Ver recibo" en el detalle del pedido, con
  `expo-web-browser` (`openBrowserAsync`), sin módulos nativos nuevos.

## Pagos (ADR-022, ADR-024)

Checkout Pro: la API crea la preferencia (`POST /payments/preferences`) y
valida el webhook por firma, re-consultando siempre el pago real. Las
`back_urls` apuntan a la API (`GET /payments/return/:result`), que redirige
al deep link de la app (addendum 01 de ADR-024, con instrucciones de
prueba en local para iOS y Android).

En mobile, iOS/Android abren el checkout en una sesión de navegador del
sistema (`expo-web-browser`, `openAuthSessionAsync`) que se cierra sola al
llegar a `mobile://payment/<result>`; en web es una redirección de página
completa. La pantalla de regreso nunca confía en el resultado de la URL:
re-consulta `GET /orders/:id` (con reintentos) hasta que el webhook fija el
status.

## Estado actual

- `apps/api`: `auth`, `menu` (incluye subir/quitar imagen), `orders`
  (creación, listados, status, revisión), `payments` (Checkout Pro +
  webhook), `mcp` (2 tools), `notifications` (WebSocket gateway +
  WhatsApp), `storage` y `pdf` (recibo del pedido, ADR-028).
- `apps/dashboard`: features `auth`, `menu` (CRUD + imagen del platillo:
  selector con vista previa y validación previa con las reglas de
  shared-types, miniatura en la tabla), `notifications` (campanita
  con historial persistente) y `orders` (lista, detalle, status y
  revisión, recibo PDF).
- `apps/mobile`: features `auth`, `menu`, `chat`, `session`, `theme`,
  `navigation`, `cart` (carrito persistido en AsyncStorage + checkout que
  crea un pedido con todos los platillos, con aviso de rango
  serves_min/serves_max), `orders` ("Mis pedidos": lista paginada y
  detalle con "Ver recibo") y `payments` (Pagar → Checkout Pro con `expo-web-browser`, y
  pantalla de regreso `/payment/<result>` que re-consulta el pedido).
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
