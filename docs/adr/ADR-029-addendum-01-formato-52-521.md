# ADR-029 — Addendum 01: formato 52 vs 521 verificado contra Meta

**Estado:** Aceptado
**Fecha:** 2026-10-07
**Relacionado:** complementa ADR-029 seccion 3, "El detalle del 52 1" (no lo
reemplaza; ADR-029 no se edita)

## Contexto

ADR-029 dejo como pendiente de verificar que formato acepta Meta para los
celulares de Mexico, porque el token de entonces respondia `131005` al
enviar. Con un token de usuario de sistema (sin caducidad, con
`whatsapp_business_messaging` y `whatsapp_business_management`) se corrio
`pnpm run wa:smoke`:

| Prueba | Enviado (`to`) | Resultado | `contacts[0].wa_id` |
|---|---|---|---|
| `hello_world` | `52` + 10 digitos (12) | Aceptado y entregado | `521` + 10 digitos (13) |
| `jaspers_market_order_confirmation_v1` | `52` + 10 digitos (12) | Aceptado y entregado, con nombre, folio y fecha | — |

O sea: **Meta acepta el formato actual para enviar, pero identifica la
cuenta con el formato viejo.** El `wa_id` que devuelve no es igual, caracter
por caracter, al numero que mandamos ni al que guarda la lista de
destinatarios permitidos.

## Decision

1. **Envio:** se queda `52` + 10 digitos por default
   (`WHATSAPP_MX_NUMBER_FORMAT=52`). `521` sigue disponible por variable si
   en produccion Meta lo pidiera.
2. **Comparacion:** nunca se comparan numeros de WhatsApp como texto. Para
   saber si un `wa_id` (respuestas, y a futuro webhooks de estados o
   mensajes entrantes) corresponde a un cliente o al negocio se usa
   `isSameWhatsAppNumber(a, b)`, que trata `52XXXXXXXXXX` y
   `521XXXXXXXXXX` como el mismo numero. `canonicalWhatsAppNumber` da la
   forma estable (`52` + 10 digitos para Mexico; solo digitos para otros
   paises, como llegan los `wa_id`) por si hay que guardar o indexar por
   numero.
3. `normalizeMexicanNumber` ya producia el mismo resultado para las dos
   formas; ahora lo dice su documentacion y lo cubren tests.
4. El log de cada envio solo muestra el `wa_id` cuando es de verdad otro
   numero, no cuando solo difiere el `1`.

## Consecuencias

- El webhook de WhatsApp (pendiente, fuera de esta rama) debe buscar al
  cliente con `isSameWhatsAppNumber` / `canonicalWhatsAppNumber`, no con un
  `WHERE whatsapp_number = wa_id`.
- `users.whatsapp_number` se sigue guardando como lo escribe el cliente; se
  normaliza al enviar. Si mas adelante se indexa por numero, guardar la
  forma de `canonicalWhatsAppNumber`.
