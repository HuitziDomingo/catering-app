# ADR-019: Vitest para pruebas unitarias de la landing (Astro)

**Estado:** Aceptado
**Fecha:** 2026-07-22

## Contexto

Las demas apps del monorepo usan Jest (api, dashboard, mobile) o Cypress
(E2E de dashboard), segun ADR-007. Astro no comparte ese mismo pipeline de
transformacion de archivos, y su documentacion oficial recomienda un
runner distinto para probar componentes .astro.

Se necesita al menos cobertura minima en apps/landing: confirmar que los
botones de descarga (App Store, Google Play) apuntan al href esperado y
tienen el texto correcto, para detectar cambios accidentales de copy o de
enlaces rotos.

## Decision

Se usa **Vitest** para las pruebas unitarias de apps/landing, en vez de
Jest.

## Justificacion

- Es el runner recomendado por la documentacion oficial de Astro,
  con soporte nativo para renderizar y probar archivos .astro sin
  configuracion adicional compleja.
- Mas rapido que Jest en proyectos basados en Vite (Astro usa Vite por
  debajo).
- El alcance de las pruebas de landing es minimo (verificar contenido
  estatico: hrefs y textos de botones, presencia del QR cuando se
  agregue) — no requiere compartir infraestructura de test con las demas
  apps.

## Alternativas consideradas

| Alternativa | Por que no |
|---|---|
| Jest (igual que api/dashboard/mobile) | Requeriria configuracion adicional no trivial para procesar archivos .astro; Vitest lo soporta de forma nativa |

## Consecuencias

- apps/landing agrega vitest y @astrojs/check (o el paquete equivalente
  que Astro recomiende) como devDependencies.
- El alcance de las pruebas se mantiene minimo a proposito: existencia y
  href/texto correcto de los botones de descarga y, cuando se agregue, el
  QR. No se prueban estilos ni apariencia visual (eso queda fuera de
  alcance de pruebas unitarias).
- Jest sigue siendo el runner para api, dashboard y mobile; Vitest queda
  exclusivo de landing. No se busca unificar ambos runners en todo el
  monorepo.
