# Catering App API — colección Bruno

Colección [Bruno](https://www.usebruno.com/) (formato `.bru` clásico,
verificado contra el parser real de la app) con todos los endpoints de
`apps/api`, organizados por dominio.

## Abrir la colección

1. Instalá [Bruno](https://www.usebruno.com/downloads) (app de escritorio).
2. **Open Collection** → seleccioná esta carpeta (`docs/bruno-collection/`).
3. Arriba a la derecha, elegí el environment **Local** (ya viene
   seleccionable; `baseUrl` apunta a `http://localhost:3000/api`).
4. Arrancá la API (`pnpm nx serve api`, con Postgres corriendo vía
   `docker compose up -d`) antes de mandar requests.

## Estructura

```
docs/bruno-collection/
  bruno.json          # raíz de la colección
  collection.bru       # auth compartido (Bearer heredado) + docs de diseño
  environments/
    Local.bru           # baseUrl + placeholders documentados
  Auth/                 # register, login, refresh, me
  Menu/                 # categorías (lectura), platillos (CRUD)
  Orders/               # crear pedido, consultar por id
  MCP/                  # handshake JSON-RPC completo (1 a 5, correr en orden)
  Payments/             # crear preferencia de pago; webhook documentado (no ejecutable)
```

## Cómo fluyen las variables (sin copiar/pegar tokens a mano)

`Auth/Login` (y `Register`/`Refresh`) corren un script post-response que
guarda `accessToken`/`refreshToken` como **variables runtime** (en memoria,
via `bru.setVar`, no se escriben en `environments/Local.bru`). El resto de
las requests heredan ese Bearer token automáticamente (`auth: inherit`,
configurado una vez en `collection.bru`).

Mismo patrón para encadenar pedidos y pagos:

```
Auth/Login  →  Orders/Create Order  →  Payments/Create Preference
   (accessToken)      (orderId)              (checkoutUrl)
```

`Create Order` guarda el `id` del pedido creado en la variable runtime
`orderId`; `Create Preference` la usa directamente en el body. Para correr
esta secuencia:

- **A mano**: abrí Login → Send, después Create Order → Send, después
  Create Preference → Send, en ese orden (mismo tab de la app, para que las
  variables runtime persistan).
- **Con el Runner** (ícono de "Run" en la colección): seleccioná Auth >
  Login, Orders > Create Order y Payments > Create Preference (o corré la
  carpeta completa) y ejecutá -- corren en el orden dado por `seq`.
- **Por CLI** (`@usebruno/cli`, `npx @usebruno/cli run ...`): pasá los
  archivos en el orden deseado en un solo comando, ej.:
  ```
  npx @usebruno/cli run "Auth/Login.bru" "Orders/Create Order.bru" \
    "Payments/Create Preference.bru" --env Local
  ```
  (cada invocación de `bru run` es un proceso nuevo -- las variables
  runtime solo persisten *dentro* de un mismo comando, no entre comandos
  separados).

## Variables que necesitás setear a mano al menos una vez

- `menuItemId`: no hay endpoint para crear categorías, así que necesitás un
  `menuItemId` real para Orders/Create Order, MCP > Crear Pedido, y
  Menu > Update/Delete Item. Corré `Menu > List Items` y copiá un `id` a la
  variable de entorno `menuItemId` (o usá `Menu > Create Item` si tu
  usuario tiene rol staff/admin/superadmin -- el registro público siempre
  crea rol "customer").
- `categoryId`: igual, sacalo de `Menu > List Categories` si querés usar
  `Menu > Create Item`.

## MCP: no es REST

`POST /mcp` habla JSON-RPC 2.0 sobre Streamable HTTP (protocolo MCP real,
mismo que usa el chat de la app móvil), no un contrato REST. La carpeta
`MCP/` tiene el handshake completo numerado (1 - Initialize hasta
5 - Crear Pedido) -- corré esas 5 requests **en orden**, comparten una
sesión (`Mcp-Session-Id`, capturada automáticamente del header de
respuesta del paso 1). Ver `MCP/folder.bru` para el detalle.

## Payments/Webhook: documentado, no ejecutable con datos falsos

`Payments/Webhook (no correr manualmente).bru` existe para que el
catálogo de endpoints esté completo, pero **no tiene sentido correrlo a
mano**: el handler valida la firma HMAC contra `MERCADOPAGO_WEBHOOK_SECRET`
y además siempre re-consulta el pago real contra la API de Mercado Pago
(nunca confía en el payload del webhook, ver ADR-024) -- un `data.id`
inventado falla en cualquiera de los dos pasos. Ver los docs de ese
request, y la sección "Pagos (Mercado Pago)" del README raíz del repo,
para cómo probar el flujo completo de verdad (con ngrok + una tarjeta de
prueba de Mercado Pago).

## Validado contra la API real

Toda la colección (las 15 requests ejecutables, sin contar el webhook
documentado) corrió exitosamente vía `@usebruno/cli` contra
`apps/api` en local antes de commitear esto, incluyendo la cadena completa
Login → Create Order → Create Preference (con un `checkoutUrl` real de
Mercado Pago de vuelta) y el handshake MCP de 5 pasos.
