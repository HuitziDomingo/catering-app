# ADR-029: WhatsApp via Meta Cloud API

**Estado:** Aceptado
**Fecha:** 2026-10-06
**Relacionado:** reemplaza la decision de proveedor de ADR-026 y ADR-007
(Twilio); ADR-026 sigue vigente para *que eventos* avisan. ADR-028 (recibo
PDF y URL firmada).

## Contexto

ADR-026 implemento los avisos de WhatsApp con Twilio, pero nunca se pudo
crear la cuenta de Twilio: el registro quedo bloqueado. El codigo existia
y degradaba sin credenciales, pero ningun aviso salia.

Ya existe una app de Meta ("Santo Sazon") con el producto WhatsApp y su
numero de prueba; desde el panel de Meta llego el `hello_world` al numero
del dueno.

Ademas, WhatsApp solo deja iniciar una conversacion (mensaje del negocio
sin que el cliente haya escrito en las ultimas 24 h) con **plantillas
aprobadas por Meta**. Nuestros avisos son exactamente eso: el cliente casi
nunca nos escribe primero. Con Twilio tambien hacian falta plantillas en
produccion; los textos libres de ADR-026 solo funcionaban en el sandbox.

## Decision

### 1. Proveedor: WhatsApp Cloud API de Meta, directo

- La API llama a la Graph API de Meta:
  `POST https://graph.facebook.com/{version}/{phone-number-id}/messages`,
  con `fetch` nativo de Node 22 y sin SDK (el cuerpo es un JSON pequeno).
- Puerto `WhatsAppProvider` (`apps/api/src/notifications/whatsapp/`) con
  un solo adaptador, `MetaCloudWhatsAppProvider`. Mismo patron que
  `StorageService` (ADR-028): cambiar de proveedor es escribir otro
  adaptador.
- `WhatsAppService` decide **que** plantilla va a **quien** y con que
  variables; `OrdersService` solo dice que paso (`notifyOrderCreated`,
  `notifyStatusChanged`). Ningun fallo de WhatsApp lanza hacia el pedido.
- Degradacion elegante (igual que ADR-026): sin `WHATSAPP_PHONE_NUMBER_ID`
  o `WHATSAPP_ACCESS_TOKEN` la API arranca, registra un warning y omite los
  envios.
- Se quita la dependencia `twilio` y las variables `TWILIO_*`.

### 2. Plantillas y modos

| Evento | Destinatario | Plantilla (es_MX) |
|---|---|---|
| Pedido creado | Cliente | `pedido_recibido` |
| Pedido creado | Negocio (`BUSINESS_WHATSAPP_NUMBER`) | `nuevo_pedido_negocio` |
| `confirmed` | Cliente | `pedido_confirmado` (boton "Ver recibo") |
| `preparing` | Cliente | `pedido_en_preparacion` |
| `delivered` | Cliente | `pedido_entregado` |
| `cancelled` | Cliente | `pedido_cancelado` |
| `payment_failed` | Cliente | `pago_rechazado` |

`pedido_en_camino` queda redactada en `docs/whatsapp-plantillas.md` pero
sin conectar: el status "en camino" no existe todavia (otra rama).

`WHATSAPP_TEMPLATE_MODE`:

- `test` (default): mientras Meta aprueba las plantillas propias, todos
  los eventos mandan `jaspers_market_order_confirmation_v1` (en_US, ya
  aprobada en la cuenta). Sus variables, consultadas con
  `GET /{waba-id}/message_templates`, son `{{1}}` nombre, `{{2}}` numero de
  pedido y `{{3}}` entrega estimada; se llenan con nombre, folio y fecha
  del evento. Con `WHATSAPP_TEST_TEMPLATE=hello_world` se manda
  `hello_world` (sin variables).
- `production`: las plantillas de la tabla. El texto, la categoria
  (Utility) y el orden de variables estan en `docs/whatsapp-plantillas.md`
  y en `whatsapp-templates.ts`; se cambian juntos.

En modo de prueba Meta solo entrega a numeros de la **lista de
destinatarios permitidos** del numero de prueba (maximo 5). Eso incluye
el numero del negocio, no solo el de los clientes de prueba.

### 3. El detalle del "52 1" (numeros de Mexico)

- Hasta agosto de 2019 los celulares de Mexico se marcaban desde el
  extranjero como `+52 1` + 10 digitos. El nuevo plan de marcacion del IFT
  elimino el `1` (y el `044`/`045` nacional): hoy un celular es `+52` + 10
  digitos.
- WhatsApp arrastra el formato viejo: las cuentas de WhatsApp creadas
  antes del cambio pueden tener un identificador (`wa_id`) de 13 digitos
  `521XXXXXXXXXX`. La API devuelve el `wa_id` en `contacts[].wa_id` de cada
  envio, y puede diferir del numero mandado.
- La lista de destinatarios permitidos de nuestra cuenta guarda el numero
  de prueba como `52` + 10 digitos (12 digitos, verificado contra
  `WHATSAPP_TEST_RECIPIENT`).

Decision: `normalizeMexicanNumber` acepta lo que escriba un cliente (`+52`,
`52`, `+52 1`, `521`, `044`/`045`, espacios, guiones o solo 10 digitos) y
produce **`52` + 10 digitos** por default. `WHATSAPP_MX_NUMBER_FORMAT=521`
cambia todos los envios al formato viejo sin tocar codigo, por si Meta lo
pide en produccion. Los numeros de otros paises se mandan en E.164 sin `+`.

**Pendiente de verificar:** al implementar, el token disponible tenia los
permisos correctos (`whatsapp_business_messaging` sobre la cuenta del
numero) pero `POST /messages` respondio `131005 Access denied`, asi que no
se pudo comparar el `wa_id` real. `pnpm run wa:smoke -- hello_world`
muestra el `wa_id` (enmascarado) y, con `WHATSAPP_MX_NUMBER_FORMAT=521`,
permite probar el otro formato. Si el resultado cambia la decision, se
documenta en un addendum.

### 4. Link al recibo en "pedido confirmado"

La URL firmada del recibo dura 15 minutos (ADR-028): no sirve dentro de
un mensaje que el cliente puede abrir horas despues. Y un boton de
plantilla solo acepta `https`, no un deep link `mobile://`.

- La plantilla `pedido_confirmado` lleva un boton URL con sufijo
  dinamico: `{API_PUBLIC_URL}/api/receipts/{{1}}`.
- `{{1}}` es un JWT firmado con `RECEIPT_LINK_SECRET` (distinto de los
  secretos de sesion), audiencia `receipt-link`, con el id del pedido y
  **30 dias** de vigencia.
- `GET /receipts/:token` es publico (el navegador que abre el link no manda
  JWT): valida el token, genera **en ese momento** una URL firmada de 15
  minutos y redirige (302). Caducado: 410; invalido: 404. Los errores se
  muestran como una pagina HTML minima, porque se abre en el navegador.
- `GET /orders/:id/receipt` devuelve tambien `shareUrl` (el mismo link),
  util para compartirlo y para probarlo desde Bruno.
- Es un link portador: quien lo tenga ve ese recibo durante 30 dias. Solo
  sirve para el recibo de un pedido; no da acceso a nada mas.

### 5. Configuracion

| Variable | Para que |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | id del numero emisor (no es el telefono). |
| `WHATSAPP_ACCESS_TOKEN` | Token con `whatsapp_business_messaging`. Secreto. |
| `WHATSAPP_API_VERSION` | Version de la Graph API (default `v25.0`). |
| `WHATSAPP_TEMPLATE_MODE` | `test` (default) o `production`. |
| `WHATSAPP_TEST_TEMPLATE` | Plantilla del modo test (default jaspers). |
| `WHATSAPP_MX_NUMBER_FORMAT` | `52` (default) o `521`. |
| `WHATSAPP_TEST_RECIPIENT` | Solo desarrollo: destino de `pnpm run wa:smoke`. |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | Opcional: listar plantillas (`wa:smoke -- templates`). |
| `BUSINESS_WHATSAPP_NUMBER` | Numero del negocio (aviso de pedido nuevo). |
| `RECEIPT_LINK_SECRET` | Firma del link de 30 dias. Minimo 32 caracteres. |

Nueva validacion al arrancar (`apps/api/src/config/env.validation.ts`):
valores fuera de lista, version mal formada, `RECEIPT_LINK_SECRET` corto o
igual a un `JWT_*` truenan con un mensaje claro (sin mostrar secretos), y
`RECEIPT_LINK_SECRET` es obligatoria en modo `production` con WhatsApp
configurado. Un `BUSINESS_WHATSAPP_NUMBER` invalido **no** detiene el
arranque: se avisa en el log y se omite ese aviso.

## Alternativas descartadas

| Alternativa | Por que no |
|---|---|
| Twilio (ADR-026) | El registro de la cuenta quedo bloqueado; sin cuenta no hay envios. Ademas cobra un recargo por mensaje sobre la tarifa de Meta. |
| Intermediarios oficiales (BSP): 360dialog, Gupshup y similares | Usan por debajo la misma Cloud API de Meta y cobran una cuota mensual o recargo por mensaje. Para un negocio con pocos mensajes es un costo sin beneficio: Meta ya ofrece la API directa, con el panel, las plantillas y el numero de prueba. |
| APIs no oficiales: Whapi, Evolution API, Baileys/whatsapp-web.js | Automatizan WhatsApp Web o la app con un numero normal. Violan los terminos de servicio de WhatsApp, y Meta bloquea esos numeros, a veces de forma permanente: perder el numero del negocio es peor que no tener avisos. Tampoco hay plantillas ni garantias de entrega. |
| Textos libres en vez de plantillas | Solo se pueden mandar dentro de la ventana de 24 h despues de que el cliente escribe. Nuestros avisos casi siempre inician la conversacion. |
| URL firmada de 15 minutos directo en el mensaje | Caduca antes de que el cliente abra el mensaje (seccion 4). |
| Deep link a la app en el boton | Los botones de plantilla solo aceptan `https`, y el cliente puede no tener la app instalada. |

## Consecuencias

- Hay que registrar y esperar la aprobacion de 8 plantillas Utility en
  WhatsApp Manager (`docs/whatsapp-plantillas.md`). Mientras, modo `test`.
- Produccion requiere: numero de WhatsApp Business propio (verificacion
  del negocio en Meta), un token de **usuario de sistema** (el temporal del
  panel caduca en 24 h), `RECEIPT_LINK_SECRET` y `API_PUBLIC_URL`.
- Cambiar `RECEIPT_LINK_SECRET` invalida todos los links ya enviados.
- No se reciben mensajes ni estados de entrega (webhook de WhatsApp): fuera
  de esta rama. Sin ese webhook, un mensaje aceptado por la API puede no
  entregarse y solo se ve en el panel de Meta.
- La tabla `notifications` (ADR-006) sigue pendiente: los envios solo
  quedan en los logs de la API.
