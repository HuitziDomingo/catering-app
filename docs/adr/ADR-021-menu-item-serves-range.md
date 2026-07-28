# ADR-021: Rango min-max para porciones de un platillo (serves_people)

**Estado:** Aceptado
**Fecha:** 2026-07-25
**Relacionado:** modifica el esquema de menu_items definido en ADR-006

## Contexto

ADR-006 definio `menu_items.serves_people` como un entero unico. En la
practica, un negocio de catering vende platillos que sirven a un rango
de personas (ej. "de 300 a 500 personas" para un platon grande), no un
numero exacto. Un solo entero no puede representar eso correctamente.

## Decision

Se reemplaza la columna `serves_people` (int) por dos columnas:
`serves_min` (int) y `serves_max` (int), ambas requeridas, con
`serves_max >= serves_min`.

## Justificacion

- Representa correctamente el caso de negocio real (catering para grupos
  grandes con rango, no cantidad exacta).
- Un rango con min == max sigue cubriendo el caso de "sirve exactamente
  N personas" sin perder esa capacidad.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| Mantener un solo entero y mostrar "hasta N personas" | No captura el minimo, que es informacion real relevante para el cliente (ej. platillo grande no rentable para grupos chicos) |
| JSONB con estructura libre {min, max} | Sin ganancia sobre columnas tipadas simples; dos enteros son mas faciles de validar y consultar (ej. ordenar por capacidad) |

## Consecuencias

- Migracion en apps/api: agrega `serves_min`/`serves_max`, elimina
  `serves_people`. Sin datos de produccion reales todavia (proyecto en
  desarrollo), no se requiere migracion de datos existentes con
  fallback complejo -- se trata como breaking change directo.
- Entidad MenuItem, DTOs (Create/Update/Response) y shared-types
  actualizados: `servesMin`/`servesMax` en vez de `servesPeople`.
- Validacion: `serves_max >= serves_min`, ambos > 0.
- UI (mobile y dashboard): actualizar donde se muestra/edita este campo
  una vez el backend este actualizado.
