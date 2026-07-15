# ADR-005: Monorepo gestionado con Nx

**Estado:** Aceptado
**Fecha:** 2026-07-14

## Contexto

El proyecto tiene 3+ piezas que se comunican entre sí: dashboard Angular, app
móvil React Native, backend NestJS (incluye servidor MCP). El equipo ya usó
monorepo con Nx en el proyecto anterior.

## Decisión

Monorepo gestionado con **Nx**, con la siguiente estructura de alto nivel:

```
apps/
  dashboard/     # Angular + PrimeNG
  mobile/        # React Native (Expo) + gluestack
  api/           # NestJS: REST API + WebSocket Gateway + servidor MCP
libs/
  shared-types/  # DTOs e interfaces TypeScript compartidos
docs/
  adr/           # Este directorio
  ARCHITECTURE.md
```

## Justificación

- **Tipos compartidos**: un cambio en un DTO (ej. `Order`) se propaga a los
  dos frontends sin duplicar código ni sincronizar repos a mano.
- **Contexto unificado para agentes**: un solo `ARCHITECTURE.md` y un solo
  set de ADRs dan panorama completo a cualquier agente (Claude Code, etc.)
  sin cambiar de repo.
- **CI eficiente**: `nx affected` corre solo lo que el cambio realmente toca,
  no todo el monorepo en cada push.
- **Fricción mínima para equipo pequeño**: no hay que versionar ni publicar
  paquetes compartidos; las referencias son locales.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Repos separados por app | Sincronización manual de tipos compartidos, PRs fragmentados, CI/CD triplicado — más costoso para un equipo de 1-2 personas |
| Turborepo | Válido también, pero Nx tiene generadores nativos para Angular/NestJS que reducen fricción dado el stack elegido |
