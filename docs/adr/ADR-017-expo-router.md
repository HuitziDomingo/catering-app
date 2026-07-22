# ADR-017: Expo Router para el enrutamiento de la app movil

**Estado:** Aceptado
**Fecha:** 2026-07-22

## Contexto

La app movil (apps/mobile) no tiene enrutamiento real todavia: index.js
registra un solo componente App.tsx a mano, sin navegacion entre pantallas.
Se necesita definir como se van a estructurar las rutas antes de empezar a
construir pantallas de negocio (login, menu, pedidos, chatbot de soporte).

React Router DOM (mencionado inicialmente como opcion) no aplica: depende
del DOM del navegador, que no existe en React Native.

## Decision

Se usa **Expo Router** para el enrutamiento de apps/mobile: enrutamiento
basado en archivos (la estructura de carpetas define las rutas), construido
sobre React Navigation por debajo.

## Justificacion

- Es la opcion oficialmente recomendada por Expo (ADR-008) para proyectos
  nuevos, con soporte de deep linking automatico por convencion.
- Consistencia conceptual con la landing (Astro, tambien file-based
  routing) y con el patron de "la carpeta es la ruta" que el desarrollador
  ya conoce de otros frameworks.
- Menos boilerplate que configurar React Navigation manualmente (Stack/Tab
  Navigators a mano).
- Ya estaba parcialmente detectado por Expo (el log de Metro mostraba
  "Using src/app as the root directory for Expo Router" desde el scaffold
  inicial), aunque nunca se activo realmente.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| React Navigation configurado a mano | Mas boilerplate, sin deep linking automatico; Expo Router ya lo usa por debajo de todas formas |
| React Router DOM | No funciona en React Native, depende del DOM del navegador |

## Consecuencias

- La estructura de carpetas dentro de apps/mobile/src/app/ define las
  rutas de la aplicacion (convencion de Expo Router).
- index.js deja de registrar App.tsx directo; el punto de entrada pasa a
  ser gestionado por Expo Router segun su convencion estandar.
- Las pantallas futuras (login, menu, pedidos, chatbot) se agregan como
  archivos nuevos dentro de esa estructura, no como componentes sueltos
  registrados a mano.
