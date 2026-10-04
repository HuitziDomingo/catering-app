# ADR-024: Implementacion de Mercado Pago via Checkout Pro

**Estado:** Aceptado
**Fecha:** 2026-08-10
**Relacionado:** implementa ADR-022 (decision de usar Mercado Pago)

## Contexto

ADR-022 establecio Mercado Pago como procesador de pagos, sin detallar
el mecanismo de integracion. Se necesita definir el flujo de checkout,
como se actualiza el estado del pedido tras el pago, y como se protege
el endpoint que recibe la confirmacion de pago.

## Decision

Se implementa **Checkout Pro** (pagina de pago alojada por Mercado
Pago, el cliente es redirigido ahi y de regreso), no Checkout API/Bricks
(pago embebido). El backend crea una "Preferencia de Pago" y expone un
webhook para recibir notificaciones de cambio de estado.

### Flujo

```
1. Cliente confirma un pedido (ya existente, status: pending)
2. Mobile pide al backend crear una Preferencia de Pago para ese pedido
   (POST /payments/preferences, referencia el orderId)
3. Backend llama a la API de Mercado Pago, crea la preferencia, guarda
   su id asociado al pedido
4. Mobile redirige al cliente a la URL de checkout que Mercado Pago
   devuelve (Checkout Pro)
5. Cliente paga en la pagina de Mercado Pago (nunca en nuestra app)
6. Mercado Pago redirige de vuelta a la app (success/failure/pending,
   URLs configuradas en la preferencia) Y por separado envia un webhook
   asincrono al backend con el resultado real
7. Backend valida el webhook (firma), consulta el pago real contra la
   API de Mercado Pago (nunca confia ciegamente en el payload del
   webhook), y actualiza orders.status de pending a confirmed (o
   payment_failed)
```

### Seguridad del webhook

- Se valida la firma del webhook segun el mecanismo oficial de Mercado
  Pago (header de firma + secret), rechazando peticiones no firmadas
  correctamente.
- El backend siempre re-consulta el estado real del pago contra la API
  de Mercado Pago tras recibir el webhook, en vez de confiar en el
  payload recibido — el webhook es solo una senal de "algo cambio,
  ve a revisar", no la fuente de verdad en si.

### Estado del pedido

- Se agrega un nuevo status posible a `orders.status`: `confirmed` (pago
  aprobado) y `payment_failed` (pago rechazado/cancelado), ademas de los
  ya existentes de ADR-006.
- Se agrega `orders.payment_preference_id` para asociar el pedido con su
  preferencia de Mercado Pago.

## Justificacion

- Checkout Pro evita que la app maneje datos de tarjeta directamente,
  eliminando la carga de cumplimiento PCI-DSS que Checkout API/Bricks si
  conlleva — apropiado para un proyecto sin infraestructura de pagos
  dedicada.
- Re-consultar el pago real en vez de confiar en el payload del webhook
  es la practica de seguridad estandar recomendada por Mercado Pago —
  un webhook puede ser falsificado si solo se valida la firma sin
  verificar contra la fuente de verdad.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| Checkout API/Bricks | Mayor responsabilidad de seguridad (PCI) y mas trabajo de implementacion, sin beneficio claro para el alcance actual del proyecto |
| Confiar directamente en el payload del webhook sin re-consultar | Vulnerable a webhooks falsificados; la re-consulta es el estandar recomendado |

## Consecuencias

- Nuevo PaymentsModule en apps/api con PaymentsController
  (POST /payments/preferences, POST /payments/webhook) y
  PaymentsService (SDK de Mercado Pago).
- Credenciales de Mercado Pago (Access Token) solo como variable de
  entorno, nunca en el repo.
- Migracion: agrega payment_preference_id a orders, y los nuevos
  valores de status.
- Mobile: pantalla que llama a crear la preferencia y redirige (via
  navegador/WebView) a la URL de Checkout Pro devuelta.
