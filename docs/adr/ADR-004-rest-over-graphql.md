# ADR-004: REST + WebSockets sobre GraphQL

**Estado:** Aceptado
**Fecha:** 2026-07-14

## Contexto

El proyecto anterior (monitoreo de servidores) usó GraphQL con subscriptions
para datos en tiempo real de alta frecuencia. Esta app necesita: catálogo de
menú, pedidos, y notificación en vivo al dashboard cuando llega un pedido
nuevo — un caso de tiempo real mucho más simple.

## Decisión

La API expone **REST** para operaciones CRUD (menú, pedidos, usuarios) y un
**WebSocket Gateway de NestJS (Socket.io)** puntual para notificar al
dashboard en vivo cuando llega un pedido nuevo.

## Justificación

- REST tiene menos piezas móviles que GraphQL para este dominio: sin
  resolvers ni schema duplicando los DTOs de Postgres.
- El único requisito de tiempo real es "pedido nuevo → refresca dashboard",
  que un Gateway de Socket.io resuelve de forma directa sin el overhead de
  configurar subscriptions GraphQL.
- Menor curva de aprendizaje para mantenimiento futuro (incluyendo terceros
  que en algún momento den soporte al proyecto).

## Flujo de notificación en vivo

```
Cliente hace pedido → NestJS guarda en Postgres → NestJS emite evento WebSocket
→ Dashboard Angular (suscrito) refleja el pedido en vivo
→ En paralelo: generación de PDF + envío WhatsApp + registro en historial
```

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| GraphQL con subscriptions (como el proyecto anterior) | Complejidad innecesaria para el volumen de datos en tiempo real de esta app |
| Polling desde el dashboard | Peor experiencia de usuario y carga innecesaria al backend comparado con WebSockets |
