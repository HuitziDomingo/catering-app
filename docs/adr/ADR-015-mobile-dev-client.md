# ADR-015: Dev Client propio de Expo (en vez de Expo Go genérico)

**Estado:** Aceptado
**Fecha:** 2026-07-20

## Contexto

Al verificar visualmente el botón animado de UI Kitten + Moti definido en
ADR-011, la app crashea al abrir en el Expo Go genérico (la app disponible
en App Store/Play Store) con:

```
[runtime not ready]: TypeError: undefined is not a function
  at NativeWorklets ...
```

Causa raíz confirmada: `react-native-reanimated@4.5.1` (dependencia de
Moti) requiere `react-native-worklets@^0.10.x` como peer dependency. Expo
Go, al ser un binario genérico precompilado y publicado por Expo, trae
`react-native-worklets` compilado nativamente en la versión `0.8.3` — un
choque real de ABI entre lo que el JavaScript del proyecto invoca y lo que
el binario nativo de Expo Go realmente expone. No es un error de
configuración: Expo Go no puede traer todas las combinaciones de versiones
nativas que cada proyecto individual pueda necesitar.

## Decisión

Se adopta un **Dev Client propio** (`expo-dev-client` + `expo prebuild`)
para desarrollo y pruebas de `apps/mobile`, en vez de depender del Expo Go
genérico de las tiendas de aplicaciones.

## Justificación

- Es el camino oficialmente recomendado por Expo para cualquier proyecto
  que use módulos nativos (como Reanimated/Worklets en versiones
  específicas) que excedan lo que el Expo Go genérico soporta — no es un
  workaround improvisado.
- Preserva la decisión ya tomada en ADR-011 (UI Kitten + Moti para
  animaciones reales). La alternativa —bajar `react-native-reanimated`/
  `react-native-worklets` a versiones compatibles con Expo Go— obligaría a
  abandonar Moti o usar una versión desactualizada de Reanimated,
  contradiciendo el motivo original de esa decisión.
- Es el mismo patrón que eventualmente se necesitará para builds de
  producción vía EAS Build (ADR-008) — adoptarlo ahora en desarrollo evita
  sorpresas al llegar a esa etapa.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Downgrade de `react-native-worklets`/`reanimated` a versiones compatibles con Expo Go | Obliga a abandonar Moti o usar una versión vieja de Reanimated; contradice ADR-011 |
| Quitar Moti, usar solo animaciones nativas de React Native (`Animated` API) | Pierde la ergonomía declarativa que motivó elegir Moti; cambio de alcance mayor no justificado por este bug puntual |

## Consecuencias

- Se agrega `expo-dev-client` como dependencia de `apps/mobile`.
- Se corre `npx expo prebuild` para generar las carpetas nativas `ios/` y
  `android/` (previamente no existían, ya que el proyecto vivía en modo
  managed puro).
- El flujo de desarrollo local cambia de "abrir con Expo Go" a "construir
  e instalar el Dev Client una vez, luego iterar con `npx expo start —dev-client`".
- El README debe documentar este flujo explícitamente para que no se
  repita la confusión de "por qué crashea en mi Expo Go".
