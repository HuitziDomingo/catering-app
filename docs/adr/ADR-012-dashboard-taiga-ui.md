# ADR-012: Reemplazo de PrimeNG por Taiga UI (dashboard)

**Estado:** Aceptado
**Fecha:** 2026-07-15
**Relacionado:** reemplaza la parte de Angular de ADR-003; deja sin efecto
la vigilancia de licencia establecida en ADR-009 (ya no aplica, ver más
abajo)

## Contexto

ADR-009 fijó PrimeNG en la última versión MIT (`~21.1.x`) tras detectar que
PrimeTek cambió su modelo de licencia a partir de la v22 (licencia
Community/Commercial bajo la marca PrimeUI). Esa decisión resolvía el
riesgo inmediato, pero dejaba una carga permanente: vigilar cualquier
actualización futura de Angular o PrimeNG para no cruzar accidentalmente
hacia la v22 con licencia de paga.

Al evaluar alternativas se identificó **Taiga UI**, un kit de componentes
Angular que no tiene ese riesgo estructural.

## Decisión

Se reemplaza PrimeNG por **[Taiga UI](https://taiga-ui.dev/)** como kit de
componentes del dashboard.

## Justificación

- **Licencia MIT permanente**, sin historial de cambio de modelo de
  negocio — mantenido como código abierto real por Tinkoff (una empresa
  con producto propio en producción sobre esta librería, no un vendor que
  depende de venderla).
- **Soporte nativo para Nx** (`nx g taiga-ui:ng-add`), coherente con
  ADR-005.
- **Basado en signals desde su v5** (en vez de decoradores clásicos),
  coherente con `provideZonelessChangeDetection` ya configurado en el
  scaffold del dashboard y con el patrón de signals ya usado en el
  proyecto anterior del equipo.
- Elimina por completo la carga de vigilancia de licencia que dejó
  ADR-009 — no hay una "v22 de pago" de la cual cuidarse a futuro.
- Angular mínimo soportado por Taiga UI v5 es Angular 19; el pin actual
  (`~21.0.9`, ADR-009) queda cómodamente compatible.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Mantener PrimeNG `~21.1.x` (ADR-009) | Funcional, pero mantiene una carga de vigilancia de licencia indefinida que Taiga UI elimina de raíz |
| Angular Material | Considerado en ADR-003 originalmente; menos componentes de negocio (tablas avanzadas, formularios complejos) que Taiga UI out-of-the-box |

## Consecuencias

- `apps/dashboard/package.json` deja de depender de `primeng`,
  `@primeng/themes` y `primeicons`.
- El componente de prueba de humo (botón renderizado en el scaffold) se
  reescribe con un componente equivalente de Taiga UI.
- ADR-009 permanece en el historial sin editarse (documenta una decisión
  real que se tomó en su momento), pero deja de tener efecto práctico:
  este ADR-012 es la referencia vigente para el UI kit del dashboard.
