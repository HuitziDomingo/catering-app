# ADR-022: Mercado Pago como procesador de pagos

**Estado:** Aceptado (decision tomada; implementacion pendiente)
**Fecha:** 2026-07-28

## Contexto

Se necesita cobrar a los clientes del catering dentro de la app. El
negocio opera en Mexico, con clientes mexicanos.

## Decision

Se usa **Mercado Pago** como procesador de pagos (tarjeta y otros metodos
locales), en vez de Stripe o PayPal.

## Justificacion

- Adopcion mucho mayor en Mexico que Stripe o PayPal para el tipo de
  negocio y clientela de un catering local.
- Soporta metodos de pago locales relevantes (tarjetas mexicanas,
  transferencias, efectivo en tiendas via su red) que Stripe/PayPal no
  cubren igual de bien en el mercado mexicano.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| Stripe | Menor adopcion/confianza del usuario final en Mexico para este tipo de negocio |
| PayPal | Friccion para clientes que no tienen cuenta PayPal; menos natural para pagos locales mexicanos |

## Consecuencias

- Cuando se implemente, se integra el SDK/Checkout de Mercado Pago en
  apps/api (backend, para no exponer credenciales sensibles en el
  cliente) y una pantalla de pago en apps/mobile que redirige o embebe
  su flujo de checkout.
- Esta decision se documenta ahora, antes de la implementacion, para
  dejar registro explicito y no bloquear el trabajo de la tool MCP de
  creacion de pedidos, que no depende de esto.
