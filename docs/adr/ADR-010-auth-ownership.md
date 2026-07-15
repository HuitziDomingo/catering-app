# ADR-010: NestJS como dueño único de la autenticación

**Estado:** Aceptado
**Fecha:** 2026-07-14
**Relacionado:** resuelve una contradicción entre ADR-001, ADR-002 y ADR-006

## Contexto

Al iniciar el scaffold del proyecto se detectó una contradicción entre dos
ADRs ya aceptados:

- **ADR-001** menciona a Supabase como proveedor de auth JWT/OAuth listo
  para usar — implica que Supabase sería el proveedor de identidad.
- **ADR-006** define la columna `password_hash` en la tabla `users` —
  implica que el backend NestJS es quien valida credenciales y posee el
  auth.

No es posible sostener ambas cosas como fuente de verdad del login al
mismo tiempo sin duplicar sistemas de identidad.

## Decisión

**NestJS es dueño único del sistema de autenticación.** Supabase se usa
exclusivamente como PostgreSQL alojado (ver ADR-001), no como proveedor de
identidad. El backend implementa:

- Hash de contraseñas (bcrypt o argon2).
- Emisión y validación de JWT propios.
- Refresh tokens.

## Justificación

- El servidor MCP (ADR-002) ya requiere emitir y validar JWTs propios por
  cliente, con permisos por tool (RBAC). Si Supabase fuera el proveedor de
  identidad, existirían dos sistemas de autenticación paralelos que
  necesitarían puentearse entre sí (validar si un usuario de Supabase tiene
  permiso para invocar una tool MCP).
- Un solo sistema de JWT y un solo lugar de permisos es más simple de
  mantener y de razonar para el equipo (una sola persona en esta etapa).
- El costo de escribir el módulo de auth es bajo con `@nestjs/passport` +
  `@nestjs/jwt` — es un patrón estándar en NestJS, no una pieza exótica.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Supabase Auth como proveedor de identidad | Requeriría un puente adicional entre la identidad de Supabase y el sistema de permisos MCP propio; duplica la superficie de autenticación del proyecto |

## Consecuencias

- ADR-001 queda vigente solo en cuanto a "PostgreSQL alojado gratis" —
  su mención de auth de Supabase queda sin efecto, reemplazada por esta
  decisión.
- `apps/api` incluye un `AuthModule` propio desde el scaffold inicial.
- El esquema de `users` en ADR-006 (con `password_hash`) queda confirmado
  sin cambios.
