# syntax=docker/dockerfile:1

# ── Stage 1: install all dependencies (dev included — needed to compile) ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Stage 2: build ──────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# tsc-alias has already rewritten every @config/* style import in dist/ to
# a relative path — the compiled output has zero runtime dependency on
# tsconfig-paths, which is why the production stage below only needs
# production dependencies.

# ── Stage 3: production runtime ────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies — smaller image, smaller attack surface.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Run as a non-root user (OWASP container hardening baseline).
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && mkdir -p /app/logs && chown -R appuser:appgroup /app
USER appuser

EXPOSE 5000

# Container-level liveness check — restarts the container if the process
# stops responding, independent of whatever orchestrator sits on top.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/health/live || exit 1

CMD ["node", "dist/server.js"]
