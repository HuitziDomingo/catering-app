# ADR-008: Expo sobre React Native CLI

**Estado:** Aceptado
**Fecha:** 2026-07-14

## Contexto

La app móvil de clientes se construye en React Native. Existen dos caminos
para iniciar el proyecto: React Native CLI (bare) o Expo (managed/prebuild
workflow). El desarrollador ya tiene emuladores iOS/Android configurados en
macOS específicamente para Expo, y la documentación oficial de React Native
recomienda Expo como punto de entrada por defecto.

## Decisión

La app móvil (`apps/mobile`) se construye con **Expo**.

## Justificación

- Recomendación oficial actual de React Native para iniciar proyectos nuevos.
- Entorno de desarrollo ya configurado (emuladores) específicamente para Expo,
  evita fricción de setup.
- EAS Build/Submit simplifica el pipeline de builds para iOS/Android sin
  depender de Xcode/Android Studio configurados manualmente para cada build
  de CI.
- gluestack (ADR-003) declara soporte explícito para Expo.
- Si en el futuro se necesita un módulo nativo no soportado por Expo, el
  proyecto puede migrar a un *development build* (prebuild) sin perder el
  código de la aplicación — no es una decisión irreversible.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| React Native CLI (bare) | Mayor fricción de configuración inicial (Xcode/Android Studio manual); la documentación oficial ya no lo recomienda como punto de entrada por defecto |

## Consecuencias

- `apps/mobile` se genera con el generador de Expo dentro de Nx
  (`@nx/expo` o equivalente).
- Los builds de producción se gestionan con EAS Build.
