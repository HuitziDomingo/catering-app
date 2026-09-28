# ADR-026: Notificaciones por WhatsApp via Twilio (implementacion)

**Estado:** Aceptado
**Fecha:** 2026-09-01
**Relacionado:** implementa la decision de alto nivel de ADR-007 (WhatsApp via Twilio)

## Contexto

ADR-007 decidio usar WhatsApp via Twilio para notificaciones, sin
detallar que eventos las disparan ni el formato. Ya existe un canal de
notificacion para el negocio (WebSocket/campanita en el dashboard, este
mismo dia). Falta un canal que llegue fuera de la app -- WhatsApp -- para
tanto el cliente como el negocio.

## Decision

Se agrega un `NotificationsModule` de WhatsApp (separado del
`NotificationGateway` de WebSocket ya existente, pero ambos disparados
desde los mismos puntos de `OrdersService`) que envia mensajes en dos
direcciones:

### Al negocio (staff/admin)
- Se envia cuando se crea un pedido nuevo (mismo punto donde ya se emite
  el evento de WebSocket) -- un numero de WhatsApp fijo del negocio,
  configurado por variable de entorno (`BUSINESS_WHATSAPP_NUMBER`).
- Mensaje breve: platillo(s), cantidad de personas, fecha, si quedo
  marcado `needsReview`.

### Al cliente
- Confirmacion al crear el pedido (estado `pending`).
- Aviso cuando el pedido pasa a `confirmed` (pago aprobado, via el
  webhook de Mercado Pago cuando ese modulo se complete) o a
  `payment_failed`.
- El numero de telefono del cliente se toma de su perfil de usuario
  (requiere que `users` tenga un campo de telefono -- confirmar si ya
  existe o si se necesita una migracion pequena para agregarlo).

## Justificacion

- Reutiliza los mismos puntos de disparo ya establecidos en
  `OrdersService` (creacion de pedido, cambio de estado por pago) --
  no se duplica logica de negocio, solo se agrega un canal mas de
  salida junto al que ya existe (WebSocket).
- Mensajes cortos y especificos evitan spam; no se notifica cada
  cambio menor, solo los momentos que el cliente o el negocio
  realmente necesitan saber.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| Notificar cada cambio de estado posible | Exceso de mensajes, riesgo de que el cliente ignore o bloquee el numero de negocio en WhatsApp |
| Un solo canal (solo negocio o solo cliente) | No cumple la necesidad real: ambos lados necesitan enterarse de eventos relevantes para ellos |

## Consecuencias

- Nuevo `NotificationsModule` en apps/api con un `WhatsAppService` que
  envuelve el SDK de Twilio.
- Credenciales de Twilio (Account SID, Auth Token, numero de WhatsApp
  del sandbox/negocio) solo como variables de entorno, nunca en el
  repo.
- Requiere confirmar si `users` tiene columna de telefono; si no,
  migracion pequena para agregarla.
- Pruebas con el sandbox de WhatsApp de Twilio antes de cualquier
  numero de produccion real.
