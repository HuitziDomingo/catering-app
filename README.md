# Catering App

Plataforma de pedidos para un negocio de catering: los clientes ordenan
desayunos, comidas y cenas desde una app móvil, y el negocio gestiona menú,
precios y pedidos desde un dashboard web — con un chatbot de soporte
integrado vía MCP (Model Context Protocol) para consultar pedidos en
lenguaje natural.

Proyecto construido con arquitectura *agent-native* desde el día uno:
decisiones documentadas como ADRs, `ARCHITECTURE.md` como fuente de verdad
para agentes de IA, y un servidor MCP propio como pieza central del backend.

## Stack

- **Backend:** NestJS (REST API + WebSocket Gateway + servidor MCP), TypeORM, PostgreSQL (Supabase)
- **Dashboard:** Angular + PrimeNG
- **App móvil:** React Native (Expo) + gluestack, Zustand, axios
- **Notificaciones:** WhatsApp vía Twilio
- **PDF:** pdfkit
- **Monorepo:** Nx + pnpm
- **Testing:** Jest (unitarias e integración), Cypress (E2E dashboard)
- **CI/CD:** GitHub Actions + Snyk (auditoría de dependencias)
- **Deploy:** GCP Cloud Run (API) + Firebase Hosting (dashboard)

## Estructura

```
apps/
  dashboard/     # Angular + PrimeNG — panel de operación y super usuario
  mobile/        # React Native (Expo) + gluestack — app de clientes
  api/           # NestJS: REST API + WebSocket Gateway + servidor MCP + PdfModule
  landing/       # Astro + Pico.css — landing page pública (dominio.com)
libs/
  shared-types/  # DTOs e interfaces TypeScript compartidas entre apps
docs/
  adr/           # Decisiones de arquitectura (ADR-001 a ADR-008)
  ARCHITECTURE.md
  database-design.pdf
```

Dashboard y mobile organizan su código por feature (feature/data-access/ui
en dashboard, `src/features/<nombre>/` en mobile) en vez de por tipo de
archivo — ver [ADR-020](docs/adr/ADR-020-frontend-feature-architecture.md).

## Documentación de arquitectura

Antes de tocar código, lee:

1. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — panorama completo del sistema.
2. [`docs/adr/`](docs/adr/) — el razonamiento detrás de cada decisión técnica.

## Funcionalidad — versión alfa

- Catálogo de menú (desayuno/comida/cena) con precios editables.
- Pedidos desde la app móvil.
- Dashboard con vista de pedidos en tiempo real y gestión de precios.
- Autenticación de usuarios.
- Notificación por WhatsApp a los administradores cuando llega un pedido.
- Notificación por WhatsApp al cliente con PDF de su compra.
- Página de super usuario: historial de clientes, gasto total, generación de
  PDF de clientes por semana/mes.
- Chatbot de soporte en la app, usando un servidor MCP propio para consultar
  pedidos.

## Desarrollo

```bash
pnpm install
pnpm nx serve api          # backend NestJS
pnpm nx serve dashboard    # dashboard Angular
pnpm nx serve landing      # landing page Astro
```

### Mobile (Expo)

`apps/mobile` requiere el **Dev Client propio** (ADR-015), no el Expo Go
genérico de las tiendas de aplicaciones: Moti/Reanimated necesita
`react-native-worklets@0.10.x`, y el binario de Expo Go trae una versión
distinta compilada nativamente (crash `NativeWorklets` al abrir).

```bash
cd apps/mobile
npx expo prebuild           # una sola vez (o tras cambiar app.json/plugins)
npx expo run:ios            # build + instala el Dev Client en el simulador (una sola vez)
npx expo start --dev-client # itera contra el Dev Client ya instalado
```

No uses `pnpm nx start mobile`: el executor de Nx para Expo tiene un bug
confirmado de passthrough de stdio (sin fix disponible) que rompe la
interacción con la CLI de Expo. Corre `npx expo start` directamente desde
`apps/mobile`.

Android build for apps/mobile is currently blocked by an upstream Expo
Gradle-autolinking defect (SDK 56 + expo-router 56.2.15's @expo/ui Stack
toolbar support). iOS works via the Dev Client. Tracked as known issue,
not caused by this repo's config -- revisit on a future Expo SDK update
or if a fix ships upstream.

## Tests

```bash
pnpm nx test api           # unitarias/integración backend
pnpm nx test dashboard     # unitarias dashboard
pnpm nx e2e dashboard-e2e  # E2E con Cypress
```
