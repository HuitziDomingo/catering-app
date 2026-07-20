# syntax=docker/dockerfile:1

# --- Stage 1: build ---
FROM --platform=linux/amd64 node:22-slim AS build
WORKDIR /workspace

# pnpm es el único gestor de paquetes del monorepo (ADR-007).
RUN corepack enable && corepack prepare pnpm@10 --activate

# Copiamos el workspace completo porque Nx necesita el grafo del monorepo
# para construir apps/api con sus dependencias internas (libs/shared-types).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json nx.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm nx build api --configuration=production

# --- Stage 2: runtime ---
FROM --platform=linux/amd64 node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /workspace/dist/apps/api ./
COPY --from=build /workspace/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "main.js"]
