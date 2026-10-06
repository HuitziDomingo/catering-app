# Catering App API — colección Bruno

Colección [Bruno](https://www.usebruno.com/) (formato `.bru` clásico) con
todos los endpoints de `apps/api`, organizada por feature. La fuente de
verdad son los controllers de la API (`apps/api/src/**/*.controller.ts`):
si agregas o quitas un endpoint, actualiza también esta colección.

## Abrir la colección

1. Instala [Bruno](https://www.usebruno.com/downloads) (app de escritorio).
2. **Open Collection** → selecciona esta carpeta (`docs/bruno-collection/`).
3. Arriba a la derecha, elige el environment **Local** (`baseUrl` apunta a
   `http://localhost:3000/api`).
4. Levanta Postgres y el almacenamiento (`docker compose up -d`) y la API
   (`pnpm nx serve api`) antes de mandar requests.

## Estructura

```
docs/bruno-collection/
  bruno.json            # raíz de la colección
  collection.bru        # auth compartido (Bearer {{token}} heredado) + docs
  environments/
    Local.bru           # baseUrl, credenciales de ejemplo y variables vacías
  fixtures/
    platillo-ejemplo.jpg  # imagen generada para Menu > Upload Item Image
  Auth/       register, login, refresh, me
  Menu/       categorías y platillos (lectura pública), CRUD e imagen (staff)
  Orders/     crear, ver, "mis pedidos"; lista, status y revisión (staff, ADR-027)
  MCP/        handshake JSON-RPC completo (1 a 5, correr en orden)
  Payments/   preferencia de Checkout Pro, webhook (documentado), back_url /return
  Health/     GET /api
```

## Variables

| Variable | Quién la llena | Para qué |
|---|---|---|
| `baseUrl` | environment | `http://localhost:3000/api` |
| `loginEmail` / `loginPassword` | environment | Cuenta de ejemplo que crea Auth > Register. **Cámbialas solo en tu copia local** para usar una cuenta staff; no commitees contraseñas reales. |
| `token` / `refreshToken` | Auth > Login, Register, Refresh (script post-response) | Bearer que heredan todas las requests (`auth: inherit`) |
| `categoryId` | Menu > List Categories (si está vacía) | Menu > Create Item |
| `menuItemId` | Menu > List Items (si está vacía) | Platillo activo para Orders y MCP |
| `createdMenuItemId` | Menu > Create Item | Platillo de prueba para Update, imagen y Delete |
| `orderId` | Orders > Create Order | Get Order, status, review, Create Preference, Payment Return |
| `mcpSessionId` | MCP > 1 - Initialize | Header `Mcp-Session-Id` del resto del handshake |
| `checkoutUrl` | Payments > Create Preference | URL de Checkout Pro para pagar en el navegador |

Los scripts usan `bru.setVar` (variable **runtime**, en memoria) y no
`bru.setEnvVar`: así nunca se escriben tokens en `environments/Local.bru`,
que está versionado.

## Flujo típico

```
Auth/Login → Menu/List Items → Orders/Create Order → Payments/Create Preference
  (token)       (menuItemId)        (orderId)              (checkoutUrl)
```

- **A mano**: manda los requests en ese orden (mismo tab de la app, para
  que las variables runtime persistan).
- **Con el Runner**: corre la colección o una carpeta; el orden lo da `seq`.
- **Por CLI** (`@usebruno/cli`):
  ```
  npx @usebruno/cli run "Auth/Login.bru" "Menu/List Items.bru" \
    "Orders/Create Order.bru" "Payments/Create Preference.bru" --env Local
  ```
  Las variables runtime solo viven dentro de un mismo comando.

## Requests que necesitan rol staff/admin/superadmin

Menu > Create/Update/Delete Item y Upload/Remove Item Image; Orders > List
Orders (staff), Update Order Status y Review Order. Con la cuenta de
ejemplo (rol `customer`) responden 403, que es lo esperado. Para probarlos,
cambia `loginEmail`/`loginPassword` en tu copia local a una cuenta staff.

## Notas por feature

- **Menu > imagen (ADR-028):** multipart con un solo archivo en el campo
  `image` (JPG, PNG o WebP, máx. 5 MB). La base guarda `image_key`; las
  respuestas traen `imageUrl`. `imageUrl` ya no se acepta en Create/Update
  Item.
- **MCP no es REST:** `POST /mcp` habla JSON-RPC 2.0 sobre Streamable HTTP.
  Corre `MCP/1` a `MCP/5` en orden: comparten el `Mcp-Session-Id` del paso 1.
  Las respuestas llegan como Server-Sent Events.
- **Payments > Webhook:** documentado, no simulable con datos inventados
  (firma HMAC real + re-consulta del pago a Mercado Pago, ADR-024). Ver
  los docs del request.
- **Payments > Payment Return:** `followRedirects: false` para ver el 302
  al deep link de la app (`mobile://payment/...`).
