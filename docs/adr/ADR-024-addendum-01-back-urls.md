# ADR-024 — Addendum 01: back_urls de Checkout Pro via la API

**Estado:** Aceptado
**Fecha:** 2026-10-03
**Relacionado:** complementa ADR-024 (no lo reemplaza; ADR-024 no se edita)

## Contexto

ADR-024 dice que Mercado Pago regresa al cliente a la app (paso 6 del
flujo), pero la preferencia se creaba sin `back_urls`: el cliente se
quedaba en la pagina de Mercado Pago y tenia que volver a mano. Para
tener pantallas de regreso (aprobado / rechazado / pendiente) hay que
configurarlas.

Mercado Pago exige URLs HTTPS publicas para `auto_return`, y no hay
garantia de que acepte un esquema propio (`mobile://`) como back_url.

## Decision

1. La preferencia se crea con `back_urls` HTTPS a la propia API y
   `auto_return: 'approved'`:
   `${API_PUBLIC_URL}/api/payments/return/{success|failure|pending}`.
2. `GET /payments/return/:result` (publico, sin JWT) responde **302** al
   deep link de la app: `${MOBILE_PAYMENT_RETURN_URL}/{result}?orderId=...&paymentStatus=...`
   (default `mobile://payment`, el scheme de `apps/mobile/app.json`).
3. El redirect es solo navegacion: `paymentStatus` es una pista. La app
   **siempre** vuelve a consultar el pedido (`GET /orders/:id`); el status
   real lo fija el webhook (ADR-024), que puede llegar antes o despues
   del regreso del cliente.
4. El destino del redirect sale de configuracion, nunca de la query (sin
   open redirect). `result` fuera de `success|failure|pending` es 400.
5. Si `API_PUBLIC_URL` no esta definida, la preferencia se crea sin
   `back_urls` (comportamiento anterior) y se registra un warning.

## Variables de entorno (`apps/api/.env`)

- `API_PUBLIC_URL`: URL publica HTTPS de la API **sin** `/api` (ej. el
  tunel que ya se usa para el webhook).
- `MOBILE_PAYMENT_RETURN_URL` (opcional): deep link base. Default
  `mobile://payment`. Para Expo web: `http://localhost:8081/payment`.

## Como probarlo en local

Prerrequisito comun: la API corriendo (`pnpm nx serve api`) y un tunel
HTTPS hacia `localhost:3000` (ngrok, cloudflared...). Poner su URL en
`API_PUBLIC_URL` y reiniciar la API. La misma URL + `/api/payments/webhook`
es la del webhook en el panel de Mercado Pago.

**1. Solo el redirect (sin Mercado Pago):** abrir en cualquier navegador
`https://<tunel>/api/payments/return/success?external_reference=<orderId>&status=approved`
y verificar el 302 a `mobile://payment/success?orderId=...`
(`curl -sI` muestra el header `Location`).

**2. Solo el deep link (sin API):**

- iOS (simulador): `xcrun simctl openurl booted "mobile://payment/success?orderId=<orderId>"`
- Android (emulador): `adb shell am start -W -a android.intent.action.VIEW -d "mobile://payment/success?orderId=<orderId>" com.anonymous.mobile`

**3. Flujo completo con Checkout Pro:**

- iOS: el navegador del simulador abre el checkout; al aprobar, Mercado
  Pago redirige a la back_url (tunel) y esta al deep link. El simulador
  pregunta "Abrir en Mobile": aceptar.
- Android: igual, pero el emulador **no** ve `localhost` del host. El
  tunel es publico, asi que el back_url funciona sin `adb reverse`; la
  API desde la app usa `10.0.2.2` (ver `apps/mobile/src/core/http/defaultApiUrl.ts`).
  El deep link `mobile://` lo resuelve el intent filter que genera
  `npx expo prebuild` a partir del `scheme` de `app.json`: si se cambia el
  scheme, hay que volver a hacer prebuild e instalar el Dev Client.
- Usar un comprador de prueba (mismo pais que el vendedor) y tarjetas de
  prueba: titular `APRO` para aprobado, `OTHE` para rechazado.
- El tunel gratuito cambia de URL al reiniciarse: actualizar
  `API_PUBLIC_URL` y la URL del webhook en el panel de Mercado Pago.

## Consecuencias

- Nuevo endpoint publico `GET /payments/return/:result`.
- La app movil necesita rutas para `payment/success`, `payment/failure` y
  `payment/pending` (Fase 3 de `feat/order-flow`).
