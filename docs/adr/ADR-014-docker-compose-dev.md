# ADR-014: Docker Compose para entorno de desarrollo local

**Estado:** Aceptado
**Fecha:** 2026-07-19

## Contexto

Durante el desarrollo de la tool MCP, la base de datos de trabajo fue una
instancia de PostgreSQL instalada vía Homebrew directo en el sistema del
desarrollador — una solución desechable y explícitamente temporal, usada
para no arriesgar la base real de Supabase (ver ADR-001) mientras se
depuraban bugs. Nunca se decidió formalmente como el flujo de desarrollo
local permanente, y tiene un problema real: no es reproducible — cualquiera
que clone el repo (un colaborador futuro, o el propio desarrollador en una
máquina nueva) tiene que instalar y configurar Postgres a mano, con el
riesgo de "funciona en mi máquina" por diferencias de versión o configuración.

## Decisión

Se usa **Docker Compose** para levantar PostgreSQL en desarrollo local. La
base de datos de producción sigue siendo Supabase (ADR-001) — Docker Compose
es exclusivamente para el entorno de desarrollo de cada máquina.

Se agrega además un `Dockerfile` multi-stage para `apps/api`, siguiendo el
mismo patrón usado en el proyecto anterior del desarrollador (build
multi-stage, `--platform linux/amd64` para compatibilidad con despliegue en
GCP Cloud Run desde Apple Silicon).

## Justificación

- **Reproducibilidad**: `docker compose up` deja a cualquiera con una base
  de datos idéntica, sin instalar Postgres en el sistema operativo.
- **Aislamiento**: no ensucia la máquina del desarrollador con un servicio
  de Postgres corriendo permanentemente en background (a diferencia de
  `brew services start`).
- **Consistencia con el proyecto anterior**: reutiliza un patrón de Docker
  ya probado por el equipo, en vez de introducir una herramienta nueva.
- **Sin riesgo para producción**: Supabase permanece intacto como única
  fuente de verdad de datos reales; Docker Compose solo maneja datos de
  prueba locales, descartables en cualquier momento.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Mantener Postgres de Homebrew | No reproducible; requiere instalación manual fuera del control del repo |
| Apuntar el desarrollo local directo a Supabase | Arriesga datos reales de producción con cada prueba durante desarrollo |

## Consecuencias

- `docker-compose.yml` en la raíz del monorepo, con un servicio `postgres`
  expuesto en un puerto no estándar (`5433`) para evitar choques con
  cualquier instancia de Postgres que ya exista en el sistema.
- `apps/api/Dockerfile` (multi-stage) y `apps/api/.dockerignore` — sientan
  la base para el futuro build de producción en Cloud Run, aunque el uso
  inmediato es solo desarrollo local.
- El `DATABASE_URL` de desarrollo en `apps/api/.env` apunta al contenedor
  local; el de producción (Supabase) se mantiene solo en variables de
  entorno de Cloud Run, nunca en el repo.
