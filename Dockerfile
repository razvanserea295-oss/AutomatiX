# syntax=docker/dockerfile:1
# Promix Automatix — web/server container (React SPA + Express API in one Node
# process). Builds the frontend (vite -> dist/) and compiles the server
# (tsc -> dist-server/), then runs Express on PROMIX_PORT (3500). Put the
# bundled Caddy service (docker-compose.yml) in front of it for automatic
# HTTPS. See DEPLOY.md.

# --- Stage 1: install ALL deps (the build needs vite + tsc from devDeps) ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Stage 2: build frontend + compile server ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx vite build && npx tsc -p tsconfig.server.json

# --- Stage 3: production-only deps (smaller runtime image) ---
FROM node:20-alpine AS proddeps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- Stage 4: runtime ---
FROM node:20-alpine AS runtime
ENV NODE_ENV=production \
    PROMIX_PORT=3500 \
    PROMIX_TRUST_PROXY=1
WORKDIR /app
RUN apk add --no-cache wget
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=builder  /app/dist        ./dist
COPY --from=builder  /app/dist-server ./dist-server
COPY migrations ./migrations
COPY package.json ./
# Lets the server resolve its version banner (require('../package.json')).
COPY package.json ./dist-server/package.json
# Data dir holds the encrypted DB, the .dbkey, and backups — mount a volume here
# so it survives container rebuilds. NEVER bake it into the image (.dockerignore
# excludes data/). Run as non-root.
RUN mkdir -p /app/data \
  && addgroup -S app && adduser -S app -G app \
  && chown -R app:app /app
USER app
VOLUME ["/app/data"]
EXPOSE 3500
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3500/api/health >/dev/null 2>&1 || exit 1
CMD ["node", "dist-server/server/index.js"]
