# ADR-011: Reemplazo de gluestack-ui + NativeWind por UI Kitten + Moti (mobile)

**Estado:** Aceptado
**Fecha:** 2026-07-15
**Relacionado:** reemplaza la parte de React Native de ADR-003 (Angular/PrimeNG
de ADR-003 permanece vigente hasta ADR-012)

## Contexto

Durante el scaffold inicial de `apps/mobile` (ver ADR-003, ADR-008), la
integración de gluestack-ui falló dos veces en `expo export`:

1. Dependencia faltante (`react-native-worklets`) requerida en tiempo de
   build por el pipeline de Babel de Expo/NativeWind.
2. Al resolverse la primera falla, `@gluestack-ui/core` instaló
   `4.0.0-alpha.0` — investigación posterior confirmó que **gluestack-ui v4
   no tiene versión estable**: su documentación oficial instala esa línea
   exclusivamente con el tag `@alpha`, sin excepción.
3. La alternativa "estable" (`5.0.15`, publicada días antes de este ADR)
   exige migrar a **NativeWind v5 + Tailwind v4**, una reescritura completa
   de configuración (metro, babel, tailwind) sobre una base que sus propios
   mantenedores describían meses antes como "todavía evolucionando", y que
   además dejó de soportar Next.js por lo reciente que es.

En resumen: toda la librería está en medio de una migración de arquitectura
mayor al momento de este ADR, independientemente de qué versión se elija.

## Decisión

Se reemplaza gluestack-ui y NativeWind en `apps/mobile` por:

- **[UI Kitten](https://akveo.github.io/react-native-ui-kitten/)** como kit
  de componentes — MIT, sin versiones alpha en su línea principal, soporte
  confirmado para React 19 y Expo 54+.
- **[Moti](https://moti.fyi/)** para animaciones declarativas de
  componentes (botones, iconos, transiciones), construido sobre
  `react-native-reanimated`.

Se elimina: `@gluestack-ui/core`, `@gluestack-ui/utils`, `nativewind`,
`tailwind.config.js`, `react-native-css-interop`, y las modificaciones a
`metro.config.js`/`.babelrc.js` hechas para NativeWind.

Se corrige el conflicto de peer dependency dejado por el intento anterior:
`react-native-reanimated@4.5.1` requiere `react-native-worklets@^0.10.x`
(se había instalado `0.8.3` por error) — se fija la versión correcta antes
de instalar Moti.

## Justificación

- UI Kitten no tiene el patrón de inestabilidad de versión que gluestack
  mostró en la práctica (dos fallas reales, no hipotéticas) — es la opción
  "aburrida y confiable" que el proyecto necesita al ser un producto real
  para un negocio con clientes activos.
- Se descarta React Native Elements (otra alternativa evaluada) por
  actividad de mantenimiento notablemente más baja que UI Kitten.
- Se pierde la consistencia visual Tailwind entre dashboard y mobile que
  gluestack ofrecía, y el servidor MCP de generación de componentes de
  gluestack — ninguno de los dos es indispensable para el alfa, y el
  Angular no depende de esta decisión (ver ADR-012 para el reemplazo,
  independiente, de PrimeNG).

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Aceptar gluestack v4 `@alpha` tal cual | El propio proyecto no promete estabilidad de API bajo ese tag; ya causó dos fallas de build reales |
| Migrar a gluestack v5 + NativeWind v5 + Tailwind v4 | Cambio de infraestructura mayor y prematuro para un stack que apenas arranca, sobre una base (NativeWind v5) con semanas de estabilizada |
| React Native Elements | Ritmo de mantenimiento más bajo que UI Kitten según evidencia reciente |

## Consecuencias

- `apps/mobile/package.json` ya no depende de `nativewind` ni de ningún
  paquete `@gluestack-ui/*`.
- Los componentes ya generados por el CLI de gluestack
  (`components/ui/button`, etc.) se eliminan y se reconstruyen con UI
  Kitten.
- El botón de prueba de humo del scaffold se reescribe usando un
  componente de UI Kitten envuelto en una animación de Moti.
