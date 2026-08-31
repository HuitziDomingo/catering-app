# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A catering ordering platform: customers order breakfast/lunch/dinner from a mobile app; the business manages menu, prices, and orders from a web dashboard; a support chatbot embedded in the mobile app uses a self-hosted MCP server to query/create orders in natural language. It's both a real product for an active business and a portfolio piece deliberately built *agent-native* (architecture decisions documented as ADRs, `docs/ARCHITECTURE.md` as living source of truth for AI agents, a custom MCP server as a first-class backend piece).

**Read `docs/ARCHITECTURE.md` and skim `docs/adr/` before making architectural changes.** ADRs are numbered and accepted ADRs are never edited — a superseding decision gets a new ADR number (e.g. ADR-009 supersedes parts of ADR-003; ADR-010 supersedes parts of ADR-001). `docs/ARCHITECTURE.md`, unlike the ADRs, is kept current and should be updated when architecture actually changes.

Repo language note: code, comments, and docs are mostly in Spanish (ADRs, `ARCHITECTURE.md`, README, migration/entity naming intent). Match the existing language when editing a file rather than switching it to English.

## Monorepo layout (Nx + pnpm)

```
apps/
  api/        NestJS — REST API + WebSocket Gateway + MCP server + PDF generation
  dashboard/  Angular + Taiga UI — operator/admin dashboard
  mobile/     React Native (Expo) + UI Kitten + Moti — customer-facing app
  landing/    Astro + Pico.css — public marketing page
libs/
  shared-types/  DTOs, entities, enums, and WS event types shared across apps
docs/
  adr/              numbered architecture decision records
  ARCHITECTURE.md   consolidated, living architecture overview
```

pnpm is the only package manager used in this monorepo (do not use npm/yarn). There's a root `pnpm-workspace.yaml`; `apps/landing` and `apps/mobile` have their own `package.json` in addition to the root one.

## Commands

Install: `pnpm install`

Run apps:
```bash
pnpm nx serve api          # NestJS backend (needs apps/api/.env — see apps/api/.env.example)
pnpm nx serve dashboard    # Angular dashboard
pnpm nx serve landing      # Astro landing page
```

Local Postgres for dev: `docker-compose up -d` (Postgres 16 on port **5433**, not 5432 — see ADR-014). In production, Supabase-hosted Postgres is used purely as hosting, not for auth (ADR-001, ADR-010).

Mobile (Expo) — **do not use `pnpm nx start mobile`**: the Nx Expo executor has a known stdio-passthrough bug that breaks interaction with the Expo CLI. Run Expo directly instead:
```bash
cd apps/mobile
npx expo prebuild           # once, or after changing app.json/plugins
npx expo run:ios            # builds + installs the Dev Client in the simulator, once
npx expo start --dev-client # iterate against the already-installed Dev Client
```
Mobile requires the custom **Dev Client**, not generic Expo Go from the app stores (ADR-015) — Moti/Reanimated needs `react-native-worklets@0.10.x`, and Expo Go ships a different natively-compiled version (crashes with `NativeWorklets` on open). Android needs Expo SDK 57+ (see README for the Gradle-autolinking history); after changing native config, prebuild clean: `npx expo prebuild --clean -p android && ./gradlew :app:assembleDebug`.

Tests:
```bash
pnpm nx test api                     # api unit/integration tests (Jest)
pnpm nx test dashboard                # dashboard unit tests (Jest)
pnpm nx test mobile                   # mobile unit tests (jest-expo)
pnpm nx test <project> -t "<name>"    # run tests matching a name pattern
pnpm nx test <project> --testFile=<path>   # or just pass a path/pattern as a positional jest arg
pnpm nx e2e dashboard-e2e              # Cypress E2E (dashboard) — if configured
cd apps/landing && vitest run          # landing tests (invoked via `pnpm nx test landing` too)
```
Every project's `test` target is `@nx/jest:jest` (or `vitest` for landing) inferred/declared per `project.json` — pass extra Jest CLI flags after `--` when using `nx test`, e.g. `pnpm nx test api -- -t "OrdersService"`.

Lint/build:
```bash
pnpm nx lint <project>
pnpm nx build <project>
pnpm nx affected -t lint      # what CI actually runs, scoped to changed projects
pnpm nx affected -t test
pnpm nx affected -t build --exclude=mobile   # mobile's inferred build is an EAS cloud build, not runnable in CI
pnpm nx affected -t export    # mobile's JS/TS bundle only (Metro), no native compile
```

Database migrations (TypeORM, run from repo root):
```bash
pnpm run migration:show
pnpm run migration:run
pnpm run migration:revert
```
Migrations live in `apps/api/src/database/migrations/`; the data source is `apps/api/src/database/data-source.ts`.

CI (`.github/workflows/ci.yml`) runs on PRs/pushes to `main`: `nx affected` for lint → test → build (mobile excluded) → mobile export, then a Snyk dependency scan gated on high/critical severities with an available fix.

## Architecture

### Backend (`apps/api`) — NestJS, feature/module-based

Modules: `auth/` (own JWT auth, see below), `menu/`, `orders/`, `mcp/`, `notifications/` (WebSocket gateway), `database/` (TypeORM entities + migrations). Each feature module follows standard Nest layering (controller → service → DTOs), which already satisfies the project's separation-of-concerns goals — no additional architectural pattern is imposed on the backend (see ADR-020).

**Auth (ADR-010):** NestJS is the sole identity provider — bcrypt/argon2 password hashing + self-issued JWT access/refresh tokens, via `@nestjs/passport` + `@nestjs/jwt`. Supabase is *only* hosted Postgres, never an auth provider (this reversed an earlier, since-superseded plan in ADR-001). Two separate secrets for access vs. refresh tokens (`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`); see `apps/api/.env.example`. Route protection uses `JwtAuthGuard` + a `@Roles()` decorator/`RolesGuard` for RBAC; WebSocket connections use a parallel `WsJwtGuard`.

**MCP server (ADR-002, `apps/api/src/mcp/`):** the backend exposes an MCP server (`@modelcontextprotocol/sdk`) with resources (`MenuItems`, `Orders`, `Users`) and tools invocable by agents — first client is the mobile support chatbot. Tools:
- `consultar_pedidos_por_cliente(clienteId)` — query a customer's orders.
- `crear_pedido` (ADR-023) — create an order from a **structured** input (`items[]`, `peopleCount`, `scheduledFor`, `notes?`); `customerId` always comes from the authenticated JWT, never client input. The mobile chat does its own lightweight (non-LLM, regex/keyword) extraction from free text and asks for clarification on ambiguity rather than guessing; the tool itself reuses `OrdersService.createOrder` rather than reimplementing order logic.

Every tool invocation is logged to `mcp_tool_logs` (tool name, caller, params, result, timestamp) — see `mcp-tool-logs.service.ts`. When adding a new MCP tool, register it following the same pattern as the existing tools in `apps/api/src/mcp/tools/`, and add an ADR addendum documenting it (per ADR-002's stated process).

**Order flow (end-to-end):** mobile app builds an order → `POST /orders` → API validates against `menu_items`, computes totals, persists `orders` + `order_items` (with a **price snapshot** per item, so historical reports stay correct even after prices change) → API emits a WebSocket event so the dashboard reflects new orders live → in parallel: `PdfModule` generates a receipt, WhatsApp (Twilio) notifies the customer with the PDF attached, WhatsApp notifies the admins, and everything is logged to `order_documents`/`notifications`.

**Database (ADR-006, full ER diagram in `docs/database-design.pdf`):** UUID primary keys, soft deletes on `users`, price snapshots in `order_items`, JSONB for flexible menu attributes, audit trails in dedicated tables (`menu_item_price_history`, `notifications`, `mcp_tool_logs`). Core tables: `roles`, `users`, `menu_categories`, `menu_items`, `menu_item_price_history`, `orders`, `order_items`, `order_documents`, `notifications`, `mcp_tool_logs`.

**Rate limiting:** global per-IP throttle (`ThrottlerGuard`, 100 req/min) is intentionally lax so it doesn't affect public menu browsing; sensitive endpoints (auth) apply a stricter limit locally via `@Throttle`.

### Frontends (`apps/dashboard`, `apps/mobile`) — feature-first ("scream architecture")

Per ADR-020, both frontends organize by feature, not by file type, with the same conceptual split as the backend's port/adapter separation — applied idiomatically per framework rather than forcing identical code shape between Angular and React Native:

- **Dashboard** (`apps/dashboard/src/app/features/<name>/`): `feature/` (components/pages, the view), `data-access/` (services talking to the API — the adapter layer), `ui/` (pure presentational components, no business logic, reusable across features), `util/` (shared helpers). `core/` holds cross-cutting app concerns (auth guard/interceptor, theme, http helpers).
- **Mobile** (`apps/mobile/src/features/<name>/`): same four-fold split, using Zustand for state and axios for data access (ADR-007). Routes under `src/app/` are dictated by Expo Router (ADR-017, file-based routing) and are kept thin — they only import/assemble what lives in `features/`, no business logic directly in route files.

This was piloted on the `menu` feature first before extending to `auth`/`chat`/others — check an existing feature (e.g. `features/menu/` or `features/chat/`) as the template when adding a new one, rather than inventing a new shape.

### Shared types (`libs/shared-types`)

TypeScript DTOs, entities, enums, and WebSocket event types shared between `api`, `dashboard`, and `mobile`, imported as `@catering-app/shared-types` (path-mapped in `tsconfig.base.json`). Keep entity/enum shapes here in sync with the actual TypeORM entities in `apps/api/src/database/entities/` — this lib has no own tests/build target, it's pure type re-export (`libs/shared-types/src/index.ts`).

Note for mobile tests specifically: Jest's module resolution for this workspace lib is hand-mapped in `apps/mobile/jest.config.cts` (`moduleNameMapper`) rather than relying on Nx's TS path resolution, since `jest-expo`'s resolver doesn't know about Nx workspace paths.

## Conventions

- Single quotes, Prettier-formatted (`.prettierrc`); ESLint via `@nx/eslint-plugin` flat config, with Nx module-boundary enforcement across all lib/app tags.
- Tests live alongside source as `*.spec.ts` (api/dashboard) or `*.test.ts`/`*.test.tsx` (mobile), not in a separate test tree.
- ADRs are numbered and immutable once accepted; a reversed/updated decision is a new ADR, not an edit to the old one (see the ADR-003/ADR-009 and ADR-001/ADR-010 examples already in the repo).

