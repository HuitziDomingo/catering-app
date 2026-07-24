# ADR-020: Arquitectura feature-first (scream architecture) en dashboard y mobile

**Estado:** Aceptado
**Fecha:** 2026-07-23

## Contexto

El backend (apps/api) ya sigue una organizacion modular con inspiracion
hexagonal gracias al propio diseno de NestJS (modulos, inyeccion de
dependencias, separacion de controllers/services/DTOs) — no requiere
cambios, es satisfactoria tal como esta.

Faltaba definir un principio equivalente para los dos frontends
(apps/dashboard en Angular, apps/mobile en React Native/Expo), motivado
por aprendizaje deliberado de patrones de arquitectura (meta personal del
desarrollador de crecer hacia AI Architect), no por dolor real en el
codigo actual.

## Decision

Se adopta una organizacion **feature-first** ("scream architecture": la
estructura de carpetas grita que hace la app, no que tipo de archivo es)
en ambos frontends, con separacion de responsabilidades dentro de cada
feature.

### Dashboard (Angular + Nx)

Patron oficial recomendado por Nx para monorepos Angular grandes. Dentro
de cada feature (menu, orders, auth, etc.):

- `feature/` — componentes y paginas (la vista)
- `data-access/` — servicios que hablan con la API (capa de adaptador,
  analoga a los puertos/adaptadores del backend)
- `ui/` — componentes de presentacion puros, sin logica de negocio,
  reutilizables entre features
- `util/` — helpers compartidos

### Mobile (Expo Router + React Native)

Misma filosofia, adaptada: la logica de negocio real vive en
`src/features/<nombre>/` (componentes, estado con Zustand, acceso a datos
con axios — ambos ya decididos en ADR-007). Las rutas de `src/app/`
(impuestas por Expo Router, ADR-017) quedan delgadas: solo importan y
ensamblan lo que vive en `features/`, sin logica de negocio metida
directamente en el archivo de ruta.

## Justificacion

- Coherente con la filosofia ya aplicada en el backend: separar "que hace
  el negocio" de "como se conecta con el mundo exterior" (API, UI).
- Es el patron oficial de Nx para Angular, no una convencion exotica o
  experimental — facil de encontrar documentacion y ejemplos.
- Ambos frontends terminan con la misma filosofia conceptual aunque cada
  uno use las herramientas idiomaticas de su framework — consistencia de
  principios sin forzar identidad de codigo entre Angular y React Native.
- Al ser aprendizaje deliberado, se aplica primero como piloto acotado
  (ver Consecuencias) antes de extenderlo a todo el codebase.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| MVVM | Tambien valido para UI, pero menos alineado con el objetivo de aprendizaje de arquitectura de sistemas (mas relevante para la meta de AI Architect que un patron de UI especifico) |
| Dejar ambos frontends sin estructura formal de features | Pierde la oportunidad de aprendizaje deliberado que motiva este ADR |
| Reestructurar tambien el backend con Hexagonal explicito | Descartado: NestJS ya resuelve esto bien por diseno, tocarlo seria resolver un problema que no existe |

## Consecuencias

- Se aplica primero como piloto al modulo de menu en ambos frontends
  (dashboard y mobile), como ejercicio de aprendizaje acotado antes de
  extenderlo a auth/orders.
- Los componentes/paginas ya existentes como prueba de humo (el boton de
  Taiga UI en dashboard, el boton de UI Kitten + Moti en mobile) se
  reorganizan bajo esta estructura como parte del piloto, sin cambiar su
  comportamiento.
- Si el patron se siente natural y util despues del piloto, se extiende a
  los demas modulos (auth, orders). Si no, se documenta el aprendizaje y
  se reconsidera.
