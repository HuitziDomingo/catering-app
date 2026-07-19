# ADR-013: Versión del SDK MCP

**Estado:** Aceptado
**Fecha:** 2026-07-17

## Contexto

El servidor MCP se implementa con el SDK oficial `@modelcontextprotocol/sdk`. El proyecto
tiene dos líneas principales: v1.x (estable, producción) y v2.x (en desarrollo contra un
borrador más nuevo del spec). Para un producto real que debe ser mantenible a futuro,
es crítico elegir una versión estable.

## Decisión

Usar `@modelcontextprotocol/sdk` v1.x (pin a `^1.29.0`) para el servidor MCP. No usar v2
hasta que haya sido lanzado oficialmente y haya sido estable por un tiempo significativo.

## Justificación

v1.x es la línea de producción soportada oficialmente. v2 está en desarrollo activo
contra un borrador del spec que puede cambiar sin aviso, lo que introduce riesgo de
breaking changes en un producto real. Revisar esta decisión cuando v2 se lance como
estable y tenga al menos 6 meses de estabilidad en el ecosistema.
