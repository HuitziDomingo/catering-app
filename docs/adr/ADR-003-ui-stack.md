# ADR-003: Stack de UI — gluestack (React Native) + PrimeNG (Angular)

**Estado:** Aceptado
**Fecha:** 2026-07-14

## Contexto

Se necesitan dos interfaces: la app móvil de clientes (React Native/Expo) y el
dashboard de administración (Angular). Ambas deben verse profesionales sin
invertir tiempo excesivo construyendo componentes desde cero.

## Decisión

- **React Native:** [gluestack](https://gluestack.io/) — componentes con
  Tailwind vía NativeWind, mismo código para Expo y Next.js.
- **Angular:** [PrimeNG](https://primeng.dev/) — librería de componentes
  madura (80+ componentes), actualmente en v20.

## Justificación

- gluestack da consistencia visual entre web y móvil si en el futuro se
  reutiliza código entre Next.js y Expo, y tiene su propio servidor MCP para
  generación de componentes — coherente con el enfoque agent-native del proyecto.
- PrimeNG cubre patrones de dashboard (tablas, formularios, gráficas) sin
  reinventar componentes complejos.

## Riesgo conocido

PrimeNG históricamente tarda en dar soporte a versiones nuevas de Angular
justo después de su release. **Al hacer el scaffold del proyecto, fijar
explícitamente la versión de Angular compatible con la versión de PrimeNG
elegida**, y documentarlo en el `package.json` del workspace `dashboard`.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Angular Material | Válido, pero menos componentes de negocio (tablas avanzadas, dashboards) que PrimeNG out-of-the-box |
| NativeBase / Tamagui (RN) | Gluestack tiene mejor tracción reciente y soporte MCP nativo |
