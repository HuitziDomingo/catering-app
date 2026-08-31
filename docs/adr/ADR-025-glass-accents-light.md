# ADR-025: Acentos de vidrio (glassmorphism) ligeros, no rediseno completo

**Estado:** Aceptado
**Fecha:** 2026-08-27

## Contexto

Se queria explorar una combinacion de estilo "glassy" (vidrio esmerilado,
translucidez) con principios de Material Design en ambos frontends
(mobile con UI Kitten/Eva Design, dashboard con Taiga UI).

Taiga UI no esta construido sobre Material Design -- tiene su propio
sistema de diseno. Forzar Material Design completo encima de Taiga
repetiria el error ya evitado con PrimeNG/gluestack (ADR-009/ADR-011):
pelear contra las convenciones propias de un framework en vez de
trabajar con ellas.

Ademas, el branding real del negocio (colores, isotipo, de los
hermanos duenos del negocio) sigue sin entregarse. Invertir en un
rediseno visual grande antes de tener esa paleta real arriesga tener
que rehacerlo cuando llegue.

## Decision

Se aplican **acentos de vidrio ligeros** (blur sutil, translucidez) en
puntos especificos de la UI -- headers, modales, tarjetas flotantes --
usando los tokens de color/elevacion que Eva Design y Taiga UI ya
proveen. No se hace un rediseno sistemico del lenguaje visual completo,
y no se intenta imponer Material Design sobre Taiga UI.

### Mobile (Eva Design/UI Kitten)

- `expo-blur` (`BlurView`) para el header y modales/tarjetas flotantes
  puntuales.
- Eva Design ya tiene principios cercanos a Material (elevacion, cards),
  asi que el efecto de vidrio se suma sobre eso, no lo reemplaza.

### Dashboard (Taiga UI)

- `backdrop-filter` de CSS (bien soportado en navegadores modernos)
  para el header y el modal de menu ya existente, usando los tokens de
  color de Taiga (`--tui-*`) para que el efecto respete el tema
  claro/oscuro.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| Material Design completo sobre Taiga UI | Repetiria el error de pelear contra el sistema de diseno propio de un framework (leccion de ADR-009/ADR-011) |
| Rediseno visual completo ahora | El branding real del negocio sigue pendiente; riesgo de rehacer el trabajo cuando llegue |

## Consecuencias

- Cambios acotados a componentes especificos (headers, modales,
  tarjetas), no a todo el sistema de componentes.
- Reversible/ajustable facilmente cuando llegue el branding real.
- Mobile y dashboard se implementan en ramas separadas, siguiendo el
  patron ya establecido en el proyecto.
