# ADR-001: Elección de motor de base de datos

**Estado:** Aceptado
**Fecha:** 2026-07-14

## Contexto

La app gestiona pedidos de catering: clientes ordenan comida para un número de personas,
el negocio administra menú y precios, y se requiere trazabilidad de compras (para reportes
de super usuario) y de cambios de precio. Existe una cuenta gratuita de MongoDB Atlas ya
disponible, y el equipo tiene experiencia previa con MongoDB del proyecto anterior.

## Decisión

**PostgreSQL** es el motor de base de datos y fuente de verdad única del sistema,
alojado en un tier gratuito de **Supabase** (incluye auth JWT/OAuth listo para usar).

## Justificación

- **Transacciones ACID reales**: un pedido implica múltiples filas relacionadas
  (orden, ítems, historial de precio, notificación) que deben confirmarse o
  revertirse como unidad. MongoDB soporta transacciones multi-documento, pero
  PostgreSQL las ofrece de forma nativa y más eficiente para este patrón relacional.
- **Integridad referencial**: relaciones fuertes usuario → pedido → ítems → menú
  se validan a nivel de base de datos (foreign keys, constraints), no solo en
  código de aplicación.
- **Auditoría y reportes**: SQL con agregaciones, window functions e índices
  compuestos es más natural para "gasto total del cliente en el mes" que
  agregaciones de MongoDB.
- **Flexibilidad sin perder consistencia**: columnas `JSONB` cubren los casos
  donde antes se hubiera usado Mongo (atributos dinámicos de menú), sin partir
  la fuente de verdad en dos bases.
- **Auth incluido**: Supabase da autenticación lista, reduciendo trabajo en el
  alfa donde ya se requiere login de clientes y hermanos.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| MongoDB Atlas (ya disponible) | Menor garantía de consistencia transaccional para pedidos/pagos; reportes financieros más complejos de construir |
| Postgres + Mongo híbrido | Complejidad operativa doble (dos bases, dos backups, sincronización) sin beneficio claro en esta etapa |
| Cloud SQL (GCP) | Válido a futuro, pero el free tier es más limitado en el tiempo que Supabase |

## Consecuencias

- La cuenta de MongoDB Atlas queda disponible para uso futuro no transaccional
  (logs, analítica de eventos) si el producto crece.
- El ORM/query builder del backend NestJS debe ser compatible con PostgreSQL
  (ej. Prisma o TypeORM).
