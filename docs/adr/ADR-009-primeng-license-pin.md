# ADR-009: Fijar PrimeNG en versión MIT ante cambio de licencia (PrimeUI)

**Estado:** Aceptado
**Fecha:** 2026-07-14
**Relacionado:** amplía ADR-003

## Contexto

Después de aceptar ADR-003 (PrimeNG como UI kit del dashboard), PrimeTek
anunció (jul. 2026) un cambio de modelo de licencia bajo la marca
**PrimeUI**: a partir de la **v22**, las nuevas versiones de PrimeNG dejan
de distribuirse como MIT y pasan a requerir una licencia:

- **Community**: gratuita, pero condicionada a elegibilidad (menos de
  $1M USD de ingresos anuales, menos de 5 desarrolladores, menos de 10
  empleados, menos de $3M USD de financiamiento VC) y con renovación anual
  obligatoria.
- **Commercial**: de paga ($599 USD/desarrollador, licencia perpetua con
  un año de actualizaciones).

Este proyecto se entrega a un negocio real (catering de la familia del
desarrollador) y eventualmente involucrará cobro por modificaciones —
no calificaría claramente como "no comercial", lo que introduce riesgo si
se depende de una versión sujeta a licencia Community/Commercial.

**Importante — no es retroactivo:** toda versión de PrimeNG publicada antes
de la v22 permanece MIT para siempre, sin restricciones de ingresos ni de
uso comercial. La v21.1.x (última mayor pre-cambio) es la versión más
reciente que conserva esta garantía.

## Decisión

Se mantiene PrimeNG como UI kit del dashboard (no se cambia de framework),
pero se **fija la versión explícitamente en PrimeNG `~21.1.x` con Angular
`~21.0.7`** (peer dependency confirmado; PrimeNG 21.1.x aún no soporta
Angular 21.1 al momento de este ADR).

**No se actualiza a PrimeNG 22 o superior** sin una revisión explícita de
costo/beneficio de la licencia Commercial, o una migración evaluada a una
alternativa gratuita (ej. Angular Material, que se revisará como opción
viable si en el futuro ofrece un rediseño visual moderno).

## Justificación

- Evita cualquier ambigüedad sobre "elegibilidad" de licencia Community
  para un proyecto que es, en la práctica, uso comercial.
- No introduce el costo de reescribir el dashboard con otro UI kit ahora,
  cuando PrimeNG 21.x ya cumple los requisitos visuales y funcionales.
- Mantiene la puerta abierta a migrar a otra librería gratuita (Angular
  Material u otra) en una futura revisión, sin comprometerse a eso ahora.

## Alternativas consideradas

| Alternativa | Por qué no, por ahora |
|---|---|
| Cambiar ya a Angular Material | Trabajo de migración no justificado todavía; PrimeNG 21.x resuelve el requisito de gratuidad sin cambiar de framework |
| Adoptar licencia Community de PrimeUI | Requiere confirmar elegibilidad anualmente y probablemente no aplica a un proyecto de uso comercial real |
| Pagar licencia Commercial | Contradice la prioridad explícita del proyecto de usar solo herramientas gratuitas |

## Consecuencias

- `apps/dashboard/package.json` debe fijar `primeng: "~21.1.x"` y
  `@angular/core: "~21.0.7"` de forma explícita — nunca `primeng@latest`.
- Revisar este ADR antes de cualquier actualización mayor de Angular que
  pudiera forzar una actualización de PrimeNG a v22+.
