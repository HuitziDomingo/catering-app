# Plantillas de WhatsApp para registrar en Meta

Plantillas propias de Santo Sazón para los avisos de pedidos (ADR-029). Se
registran en **WhatsApp Manager > Plantillas de mensajes > Crear plantilla**.
Mientras Meta las aprueba, la API corre con `WHATSAPP_TEMPLATE_MODE=test` y
manda la plantilla de ejemplo `jaspers_market_order_confirmation_v1`.

El nombre y el **orden de las variables** de cada plantilla deben coincidir
con `apps/api/src/notifications/whatsapp/whatsapp-templates.ts`. Si cambias
una plantilla en Meta, cambia también ese archivo y este documento.

## Datos comunes a todas

- **Categoría:** Utilidad (Utility). Son avisos de un pedido que el cliente
  hizo; no llevan promociones (si las llevaran, Meta las reclasifica como
  Marketing, que cuesta más).
- **Idioma:** Español (México), código `es_MX`.
- **Nombre:** exactamente el indicado (minúsculas y guion bajo).
- **Variables:** `{{1}}`, `{{2}}`… en orden. Meta pide un ejemplo de cada una
  al enviar la plantilla: usa los de la tabla.
- Reglas de Meta que estos textos ya respetan: el cuerpo no empieza ni
  termina con una variable, no hay dos variables juntas, y hay suficiente
  texto fijo por variable.

## En modo prueba

- Meta solo entrega a los números de la **lista de destinatarios
  permitidos** del número de prueba (máximo 5, en *Configuración de la
  API*). Agrega ahí tu número **y el del negocio**
  (`BUSINESS_WHATSAPP_NUMBER`): si no, el aviso de pedido nuevo falla con el
  error 131030.
- **Formato de los números de México** (verificado el 2026-10-07, addendum
  01 de ADR-029): la API manda `52` + 10 dígitos y Meta lo acepta, pero en
  la respuesta devuelve el `wa_id` como `521` + 10 dígitos. Es el mismo
  número: no lo compares como texto, usa `isSameWhatsAppNumber`. En la lista
  de destinatarios permitidos, el número aparece como `52` + 10 dígitos.
- `jaspers_market_order_confirmation_v1` está en inglés y tiene 3 variables:
  `{{1}}` nombre ("Hi {{1}}"), `{{2}}` número de pedido y `{{3}}` entrega
  estimada. La API las llena con nombre del cliente, folio y fecha del
  evento, sea cual sea el aviso. Su botón abre una página fija de Meta, no
  el recibo.

---

## 1. `pedido_recibido` — al cliente, al crear el pedido

**Encabezado (texto):** Recibimos tu pedido

**Cuerpo:**

```
Hola {{1}}, recibimos tu pedido {{2}} para el {{3}}, para {{4}} personas.

Te avisaremos por este medio cuando el pago esté confirmado.
```

**Pie:** Santo Sazón

| Variable | Contenido | Ejemplo |
|---|---|---|
| `{{1}}` | Nombre del cliente | Ana Pérez |
| `{{2}}` | Folio del pedido | 3F2A9B1C |
| `{{3}}` | Fecha y hora del evento | 20 nov 2026, 2:00 p.m. |
| `{{4}}` | Personas | 25 |

## 2. `nuevo_pedido_negocio` — al negocio, al crear el pedido

**Encabezado (texto):** Nuevo pedido

**Cuerpo:**

```
Llegó el pedido {{1}} de {{2}} para el {{3}}, para {{4}} personas.

Platillos: {{5}}.
Observaciones: {{6}}.

Revísalo en el dashboard.
```

| Variable | Contenido | Ejemplo |
|---|---|---|
| `{{1}}` | Folio | 3F2A9B1C |
| `{{2}}` | Nombre del cliente | Ana Pérez |
| `{{3}}` | Fecha y hora del evento | 20 nov 2026, 2:00 p.m. |
| `{{4}}` | Personas | 25 |
| `{{5}}` | Platillos | 2x Chilaquiles rojos, 1x Café de olla |
| `{{6}}` | Revisión | Sin observaciones / Requiere revisión: la cantidad de personas está fuera del rango de los platillos |

## 3. `pedido_confirmado` — al cliente, al pasar a `confirmed`

**Encabezado (texto):** Pedido confirmado

**Cuerpo:**

```
Hola {{1}}, tu pedido {{2}} está confirmado y el pago quedó registrado.

Tu pedido está programado para el {{3}}. Total: {{4}}.

Puedes ver tu recibo con el botón de abajo.
```

**Pie:** Este recibo no es un comprobante fiscal (CFDI).

**Botón:** *Visitar sitio web*, tipo **Dinámico**

- Texto del botón: `Ver recibo`
- URL: `https://<API_PUBLIC_URL de producción>/api/receipts/{{1}}`
  (ej. `https://api.santosazon.mx/api/receipts/{{1}}`)
- Ejemplo de la variable: `eyJhbGciOiJIUzI1NiJ9.ejemplo.firma`

| Variable | Contenido | Ejemplo |
|---|---|---|
| `{{1}}` | Nombre del cliente | Ana Pérez |
| `{{2}}` | Folio | 3F2A9B1C |
| `{{3}}` | Fecha y hora del evento | 20 nov 2026, 2:00 p.m. |
| `{{4}}` | Total | $3,700.00 |
| Botón `{{1}}` | Token del link al recibo (30 días) | — |

El dominio de la URL queda fijo en la plantilla: si cambia
`API_PUBLIC_URL` en producción, hay que editar la plantilla (y Meta la
vuelve a revisar). El token lo genera la API (`RECEIPT_LINK_SECRET`); al
abrirlo, la API genera una URL firmada de 15 minutos y redirige al PDF.

## 4. `pedido_en_preparacion` — al cliente, al pasar a `preparing`

**Cuerpo:**

```
Hola {{1}}, ya estamos preparando tu pedido {{2}} para el {{3}}.

Te avisaremos cuando esté entregado.
```

**Pie:** Santo Sazón

| Variable | Contenido | Ejemplo |
|---|---|---|
| `{{1}}` | Nombre del cliente | Ana Pérez |
| `{{2}}` | Folio | 3F2A9B1C |
| `{{3}}` | Fecha y hora del evento | 20 nov 2026, 2:00 p.m. |

## 5. `pedido_en_camino` — al cliente (todavía sin conectar)

El status "en camino" no existe aún: esta plantilla se registra cuando se
agregue (otra rama). Texto propuesto:

```
Hola {{1}}, tu pedido {{2}} ya va en camino.

Llegará en un momento, gracias por tu paciencia.
```

| Variable | Contenido | Ejemplo |
|---|---|---|
| `{{1}}` | Nombre del cliente | Ana Pérez |
| `{{2}}` | Folio | 3F2A9B1C |

## 6. `pedido_entregado` — al cliente, al pasar a `delivered`

**Cuerpo:**

```
Hola {{1}}, entregamos tu pedido {{2}}.

Gracias por elegir Santo Sazón, ¡buen provecho!
```

| Variable | Contenido | Ejemplo |
|---|---|---|
| `{{1}}` | Nombre del cliente | Ana Pérez |
| `{{2}}` | Folio | 3F2A9B1C |

## 7. `pedido_cancelado` — al cliente, al pasar a `cancelled`

**Cuerpo:**

```
Hola {{1}}, tu pedido {{2}} fue cancelado.

Si ya lo habías pagado, nos pondremos en contacto contigo para el reembolso.
```

**Pie:** Santo Sazón

| Variable | Contenido | Ejemplo |
|---|---|---|
| `{{1}}` | Nombre del cliente | Ana Pérez |
| `{{2}}` | Folio | 3F2A9B1C |

## 8. `pago_rechazado` — al cliente, al pasar a `payment_failed`

**Cuerpo:**

```
Hola {{1}}, no pudimos procesar el pago de tu pedido {{2}}.

Puedes intentarlo de nuevo desde la app, en Mis pedidos.
```

**Pie:** Santo Sazón

| Variable | Contenido | Ejemplo |
|---|---|---|
| `{{1}}` | Nombre del cliente | Ana Pérez |
| `{{2}}` | Folio | 3F2A9B1C |

---

## Después de que Meta las apruebe

1. `pnpm run wa:smoke -- templates` (con `WHATSAPP_BUSINESS_ACCOUNT_ID` en
   `apps/api/.env`) debe mostrarlas como `APPROVED`.
2. Prueba cada una con `pnpm run wa:smoke -- event <evento>` (ej.
   `order_confirmed`); llega a `WHATSAPP_TEST_RECIPIENT` con datos de
   ejemplo.
3. Cambia `WHATSAPP_TEMPLATE_MODE=production` y define
   `RECEIPT_LINK_SECRET` (la API no arranca en modo production sin ella).
