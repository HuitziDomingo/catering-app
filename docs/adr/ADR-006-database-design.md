# ADR-006: Diseño del esquema de base de datos

**Estado:** Aceptado
**Fecha:** 2026-07-14

## Contexto

La app se entrega como producto real a un negocio de catering (con clientes
activos) y también funciona como pieza de portafolio. Debe soportar
modificaciones y mantenimiento pagado a futuro sin rediseños mayores. Se
requiere: catálogo de menú con precios editables, pedidos desde app móvil,
gestión desde dashboard, historial de gasto por cliente con reportes en PDF,
notificaciones por WhatsApp con PDF de compra, y trazabilidad de invocaciones
MCP.

## Decisión

Ver diagrama ER (`docs/database-design.pdf` / `.png`). Resumen de tablas:

### `roles`
`id` (PK, smallint), `name`. Catálogo de roles (customer, staff, admin,
superadmin) como tabla, no enum fijo en código — agregar un rol nuevo es un
insert, no una migración.

### `users`
`id` (PK, uuid), `role_id` (FK), `full_name`, `email` (unique), `phone`,
`whatsapp_number`, `password_hash`, `is_active`, `created_at`, `updated_at`,
`deleted_at` (soft delete — nunca se borra un usuario con historial de pedidos).

### `menu_categories`
`id` (PK, uuid), `name`, `display_order`, `is_active`. Desayuno/comida/cena
como datos, no como enum — editable sin migración.

### `menu_items`
`id` (PK, uuid), `category_id` (FK), `name`, `description`, `base_price`,
`serves_people`, `attributes` (**JSONB** — alérgenos, extras, atributos
futuros sin alterar la tabla), `image_url`, `is_active`, timestamps.

### `menu_item_price_history`
`id` (PK), `menu_item_id` (FK), `old_price`, `new_price`, `changed_by`
(FK → `users.id`), `changed_at`. Auditoría de cada cambio de precio — quién
y cuándo, no solo el precio vigente.

### `orders`
`id` (PK, uuid), `customer_id` (FK → `users.id`), `status` (pending /
confirmed / preparing / delivered / cancelled), `people_count`,
`scheduled_for`, `subtotal`, `total`, `notes`, timestamps.

### `order_items`
`id` (PK), `order_id` (FK), `menu_item_id` (FK), `quantity`, `unit_price`
(**snapshot** del precio al momento del pedido), `subtotal`. Un cambio de
precio futuro nunca altera pedidos históricos ni los reportes de gasto.

### `order_documents`
`id` (PK), `order_id` (FK, nullable — permite reportes no ligados a un
pedido específico), `type` (receipt / weekly_report / monthly_report),
`file_url`, `generated_at`. Cubre tanto el recibo por pedido como los
reportes de super usuario.

### `notifications`
`id` (PK), `order_id` (FK, nullable), `recipient_user_id` (FK → `users.id`),
`channel` (whatsapp / email), `type`, `status` (pending / sent / failed),
`payload` (JSONB), `sent_at`. Fuente de verdad del historial de
notificaciones mostrado en el dashboard.

### `mcp_tool_logs`
`id` (PK), `tool_name`, `invoked_by`, `input_params` (JSONB),
`output_result` (JSONB), `status`, `created_at`. Auditoría de cada
invocación al servidor MCP (ver ADR-002).

## Justificación de decisiones transversales

- **UUID como PK en todas las tablas de negocio**: evita filtrar volumen de
  negocio (a diferencia de IDs autoincrementales) y facilita sincronización
  si en el futuro se separan servicios.
- **Snapshots de precio en `order_items`**: requisito directo para que el
  reporte de "cuánto gastó cada cliente" sea históricamente correcto.
- **JSONB para atributos flexibles**: evita migraciones para cada atributo
  nuevo de menú, sin sacrificar la consistencia transaccional del resto del
  esquema (ver ADR-001).
- **Tablas de auditoría separadas** (`price_history`, `notifications`,
  `mcp_tool_logs`) en vez de campos sueltos: permite reportes y trazabilidad
  sin reconstruir historial desde logs de aplicación.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Guardar solo el precio actual en `menu_items` sin historial | Imposible auditar cambios de precio o generar reportes históricos correctos |
| Campos de notificación embebidos en `orders` | No escala a múltiples notificaciones por pedido (confirmación + recibo + recordatorio) |
| IDs autoincrementales | Filtran volumen de negocio; peor para sincronización entre servicios a futuro |

## Consecuencias

- Migraciones futuras (nuevo canal de notificación, nuevo tipo de documento,
  nuevo rol) no deberían requerir cambios estructurales, solo nuevos valores
  de datos o columnas aditivas.
- El ORM elegido (Prisma o TypeORM) debe soportar JSONB de PostgreSQL de
  forma tipada.
