# ADR-007: Librerías y herramientas complementarias

**Estado:** Aceptado
**Fecha:** 2026-07-14

## Contexto

Con la arquitectura base decidida (ADR-001 a ADR-006), quedaban pendientes
las herramientas específicas para: notificaciones WhatsApp, generación de
PDF, ORM, testing E2E, manejo de estado en React Native, cliente HTTP,
auditoría de dependencias y gestor de paquetes del monorepo.

## Decisiones

### Notificaciones WhatsApp — Twilio
Más económico para empezar (sandbox gratuito en desarrollo). Se integra
desde el módulo de notificaciones del backend (ver `ARCHITECTURE.md`).

### Generación de PDF — pdfkit
Dibuja el PDF directamente sin levantar un navegador headless, a diferencia
de puppeteer. Prioridad explícita del proyecto: minimizar consumo de CPU/
memoria en Cloud Run (se paga por uso). pdfkit es adecuado porque los PDFs
requeridos (recibo de compra, reporte de clientes) son estructurados y
tabulares, no requieren reutilizar plantillas HTML/CSS complejas.

### ORM — TypeORM
Integración madura con NestJS y soporte tipado de JSONB de PostgreSQL,
necesario para `menu_items.attributes`.

### Testing E2E (dashboard) — Cypress
Estándar consolidado para E2E de aplicaciones web. Para la app móvil
(React Native) se evaluará una herramienta específica (ej. Detox) cuando
se llegue a esa fase — no bloquea el arranque del proyecto.

### Manejo de estado (React Native) — Zustand
API funcional basada en hooks, sin el boilerplate de Redux. El volumen de
estado global de esta app (sesión, carrito, estado del chatbot MCP) no
justifica la complejidad adicional de Redux.

### Cliente HTTP (React Native) — axios
React Native incluye `fetch` nativo, pero axios se prefiere por
interceptores (adjuntar JWT automáticamente), manejo de errores y
transformación de respuestas. Se descarta TanStack Query como capa de cache
de servidor por decisión del equipo; el estado de servidor se maneja
directamente con axios + Zustand donde se requiera cache manual.

### Auditoría de dependencias — Snyk
Se integra en el pipeline de GitHub Actions; tier gratuito suficiente para
el tamaño de este proyecto.

### Gestor de paquetes — pnpm (único, confirmado en todo el monorepo)
Se descarta mezclar Bun (frontend/mobile) con pnpm (backend). Motivos:

- Bun bajo Angular CLI tiene reportes de fricción (esbuild/webpack corriendo
  sobre un runtime distinto al que están más probados).
- Los builds de Docker para Cloud Run están mejor documentados y son más
  predecibles con Node/pnpm que con Bun.
- Nx tiene soporte de primera clase para pnpm en monorepos con múltiples
  apps, con un solo lockfile para todo el proyecto.

Bun queda descartado para este proyecto por priorizar estabilidad de
despliegue sobre velocidad de instalación local, dado que el entregable es
un producto real para un negocio con clientes activos.

## Consecuencias

- El `package.json` raíz del monorepo Nx usa `pnpm` como package manager
  declarado (`packageManager` field), aplicable a `dashboard`, `mobile` y
  `api`.
- El Dockerfile del backend (`apps/api`) usa una imagen base Node + pnpm.
