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
más tools MCP (crear pedidos vía agente, reportes automáticos).

## Stack

| Capa | Tecnología | ADR |
|---|---|---|
| Base de datos | PostgreSQL (Supabase) | ADR-001 |
| Backend | NestJS (REST + WebSocket Gateway + servidor MCP) | ADR-002, ADR-004 |
| UI móvil | React Native (Expo) + gluestack | ADR-003, ADR-008 |
| UI dashboard | Angular + PrimeNG | ADR-003 |
| Tiempo real | WebSockets (Socket.io) puntual, no GraphQL | ADR-004 |
| Monorepo | Nx | ADR-005 |
| Generación de PDF | pdfkit, dentro del `PdfModule` del backend NestJS | ADR-007 |
| Notificaciones | WhatsApp vía Twilio | ADR-007 |
| ORM | TypeORM | ADR-007 |
| Estado (React Native) | Zustand (cliente) | ADR-007 |
| Cliente HTTP (React Native) | axios | ADR-007 |
| Auditoría de dependencias | Snyk (integrado en CI) | ADR-007 |
| Gestor de paquetes | pnpm (único, confirmado en todo el monorepo) | ADR-007 |
| CI/CD | GitHub Actions | — |
| Tests | Jest (unitarias e integración) + Cypress (E2E dashboard) | ADR-007 |
| Deploy | GCP Cloud Run (API) + Firebase Hosting (dashboard) — confirmado, mismo patrón del proyecto anterior | — |

## Estructura del monorepo (Nx)

```
apps/
  dashboard/     # Angular + PrimeNG — panel de operación y super usuario
  mobile/        # React Native (Expo) + gluestack — app de clientes
  api/           # NestJS: REST API + WebSocket Gateway + servidor MCP + PdfModule
libs/
  shared-types/  # DTOs e interfaces TypeScript compartidas entre apps
docs/
  adr/           # Decisiones de arquitectura (ADR-001 a ADR-006 y siguientes)
  ARCHITECTURE.md
```

## Base de datos

Ver ADR-006 y `docs/database-design.pdf` para el diagrama ER completo.

Tablas principales: `roles`, `users`, `menu_categories`, `menu_items`,
`menu_item_price_history`, `orders`, `order_items`, `order_documents`,
`notifications`, `mcp_tool_logs`.

Principios de diseño: UUID como PK, soft deletes en `users`, snapshots de
precio en `order_items` para reportes históricamente correctos, JSONB para
atributos flexibles de menú, auditoría separada en tablas dedicadas
(precios, notificaciones, invocaciones MCP).

## Servidor MCP (`apps/api`)

Ver ADR-002. El backend expone un servidor MCP con recursos (`MenuItems`,
`Orders`, `Users`) y tools invocables por agentes. Primer cliente: chatbot
de soporte embebido en la app.

Primera tool: `consultarPedidosPorCliente(clienteId)`.

Toda invocación queda registrada en `mcp_tool_logs` (tool, quién invocó,
parámetros, resultado, timestamp).

## Flujo de pedido (end-to-end)

```
1. Cliente arma pedido en la app móvil (React Native)
2. POST /orders en la API NestJS
3. API valida contra menu_items, calcula totales, guarda en Postgres
   (orders + order_items con snapshot de precio)
4. API emite evento WebSocket → dashboard Angular refleja el pedido en vivo
5. En paralelo:
   a. PdfModule genera recibo de compra (PDF)
   b. Notificación WhatsApp al cliente (con el PDF adjunto)
   c. Notificación WhatsApp a los hermanos (nuevo pedido)
   d. Todo queda registrado en `order_documents` y `notifications`
```

## Proceso de trabajo del equipo

1. **ADRs antes de código** — cualquier decisión de arquitectura se documenta
   en `docs/adr/` antes de implementarse.
2. **`ARCHITECTURE.md` como contexto para agentes** — este archivo se
   mantiene actualizado y es lo primero que un agente debe leer.
3. **Tests junto con el código** — no se agrega código sin su test
   correspondiente (unitario como mínimo).
4. **Claude Code para tareas complejas, git manual para commits simples.**
5. **Ingeniería de calidad, no vibe coding** — cada decisión técnica tiene
   una justificación explícita, no solo "porque funciona".

## Pendientes de decisión (no bloquean el arranque)

- **Herramienta de E2E para React Native**: se evaluará (ej. Detox) cuando
  el proyecto llegue a esa fase.
