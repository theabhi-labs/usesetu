# CSC OS Backend — Deployment Guide

## 1. Deployment options

### A. Docker Compose (recommended — simplest correct setup)
Ships MongoDB (as a single-node replica set, required for transactions), the API, and Nginx together.

```bash
cp .env.example .env
# fill in real secrets — JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET,
# BREVO_API_KEY, R2_* keys, etc.

docker compose up -d --build
docker compose exec app npm run seed:super-admin
```

The app connects to `mongo:27017` with `replicaSet=rs0` (already wired into `docker-compose.yml`'s `MONGO_URI` override) — this is what makes the transactional flows (request creation, payment recording, refunds) work correctly out of the box.

### B. MongoDB Atlas + PM2 on a VPS
Atlas is already a replica set, so no `mongo-init` step is needed.

```bash
npm ci
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # generates the OS-level boot script
```

`ecosystem.config.js` runs the API in PM2 cluster mode (one worker per CPU core) plus two scheduled one-shot jobs (reminders every 10 min, analytics snapshot nightly at 00:05) — see the README's "Notification & Automation" and "Dashboard & Analytics" sections for why those are cron-triggered rather than in-process timers.

## 2. Environment checklist

Before starting in production, confirm every variable in `.env.example` is set with a **real, non-default** value — `env.ts` (envalid) will refuse to boot if anything required is missing, but it cannot catch a default/placeholder secret left in place. Specifically:

- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `COOKIE_SECRET` — long random strings, never reused across environments
- [ ] `MONGO_URI` — points at a replica set (Atlas, or a self-managed `rs0`)
- [ ] `BREVO_API_KEY` / `BREVO_SENDER_EMAIL` — a verified sender
- [ ] `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_URL` — Cloudflare R2 bucket credentials
- [ ] `CLIENT_URL` — the actual frontend origin (CORS + password-reset links depend on this)
- [ ] `NODE_ENV=production`
- [ ] Super Admin seeded, then its password changed immediately after first login

## 3. Health checks

| Endpoint | Purpose |
|---|---|
| `GET /health` | General status |
| `GET /health/live` | Liveness — no dependency checks, restart the process if this fails |
| `GET /health/ready` | Readiness — checks MongoDB connectivity, stop routing traffic if this fails |
| `GET /health/version` | Deployed version + Node version, for verifying a rollout |

Point your load balancer / orchestrator's readiness probe at `/health/ready` and liveness probe at `/health/live` — using the same endpoint for both is a common mistake that causes restart loops during brief DB blips.

## 4. Backup & restore

```bash
MONGO_URI="mongodb://localhost:27017/csc-os" ./scripts/backup.sh   # writes to ./backups/<timestamp>/, prunes >14 days
MONGO_URI="mongodb://localhost:27017/csc-os" ./scripts/restore.sh  # restores the most recent backup
```

Schedule `backup.sh` via cron/PM2 daily. Test `restore.sh` against a staging database monthly — an untested backup is not a backup.

## 5. Release & versioning strategy

- Semantic versioning (`vMAJOR.MINOR.PATCH`) via git tags.
- `.github/workflows/ci.yml` runs lint + build on every push/PR to `main`/`develop`.
- `.github/workflows/deploy.yml` triggers only on a version tag push (`git tag v1.2.0 && git push --tags`) — deploys are always a conscious, versioned action, never an accidental side effect of merging to `main`.
- The deploy workflow needs `DOCKER_USERNAME`/`DOCKER_PASSWORD` repository secrets before it does anything beyond build validation — see the comments in that file for wiring up an actual deploy target (SSH, Kubernetes, a managed platform's CLI).

## 6. Rollback strategy

- Docker Compose: `docker compose pull app` a previous tag, then `docker compose up -d app` — the image tag is the rollback unit.
- PM2: keep the previous `dist/` build (or check out the previous git tag and `npm run build` again), then `pm2 reload ecosystem.config.js --env production` for a zero-downtime swap.
- Database: MongoDB migrations aren't part of this codebase yet (schema changes here have all been additive/optional fields) — if a future migration is destructive, pair it with a `scripts/backup.sh` run immediately before deploying.

## 7. Production checklist (final pass before go-live)

- [ ] All environment variables set to real values (§2)
- [ ] MongoDB is a replica set (Atlas or self-managed `rs0`)
- [ ] Super Admin password changed from the seed default
- [ ] `CLIENT_URL` and CORS match the real frontend origin
- [ ] HTTPS terminated in front of Nginx (add a TLS certificate — `docker/nginx/nginx.conf` is HTTP-only by default; put a reverse proxy/load balancer with TLS in front, or extend the Nginx config with a `listen 443 ssl` block)
- [ ] Backup cron scheduled and restore tested at least once
- [ ] `job:reminders` and `job:snapshot-analytics` scheduled (PM2 `cron_restart` if using PM2; a host cron entry calling the compiled job if using Docker without PM2 inside the container)
- [ ] Rate limits (`RATE_LIMIT_*` env vars) reviewed for expected traffic
- [ ] Logs are being shipped somewhere durable (`logs/` inside the container is ephemeral unless volume-mounted — already done in `docker-compose.yml` via the `app-logs` volume)
