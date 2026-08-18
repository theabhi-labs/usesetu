# CSC OS — Backend (Foundation + Auth + Category Builder)

Production-grade backend foundation for **CSC Operating System**, built with Node.js, Express, TypeScript, and MongoDB.

## ✅ What's included in this build

- **Prompt 1 — Foundation**: Clean folder structure, env validation (envalid), Winston logging, centralized error handling, API versioning (`/api/v1`), standardized responses, security middlewares.
- **Prompt 2 — Authentication**: Register + Email OTP (Brevo), Login, JWT Access + Refresh Token rotation, Forgot/Reset/Change Password, Account Lockout, Audit Logs, RBAC (Super Admin / Admin / Staff / Customer).
- **Prompt 3 — Category Builder (No-Code)**: Unlimited nested categories, ImageKit banner upload, SEO fields, sort order, featured/homepage toggles, public tree endpoint, drag-drop reorder endpoint.
- **Prompt 4 — Service Builder (No-Code, performance-first)**: Dynamic pricing (service/govt/CSC fee split), service modes (form/queue/appointment/walk-in/hybrid), required documents, FAQs, payment settings, soft delete, public + featured + detail endpoints, compound indexes, `.lean()` reads, projected admin list, `bulkWrite` reorder, DTO-shaped public responses (cache-ready).
- **Prompt 5 — Dynamic Form Builder Engine**: 38 field types, sections, conditional logic (show/hide/require/disable with AND/OR groups), field-level validation (regex, min/max, unique-across-submissions), calculated-field scaffolding, **immutable versioning** (editing a published form forks a new draft version instead of mutating — old submissions stay bound to the exact field definitions they were submitted against), clone/publish workflow, server-side validation engine that re-evaluates conditional visibility so hidden/required rules can't be bypassed from the client, public submission endpoint with sanitization + duplicate detection.
- **Prompt 6 — Workflow Engine**: Unlimited configurable stages (color/icon/completion %/estimated duration/visibility/final flag), role-permissioned transitions (Approve/Reject/Send Back/Reopen), per-stage requirements (payment/document-verification/token/appointment must be satisfied before entry), per-stage notification flags, default-workflow-per-service management, publish/duplicate/reorder, pre-built templates, and a **pure `workflowEngine.service.ts`** with `validateTransition`/`moveStage` — deliberately dependency-free (no DB reads) so the Request Management module calls it inside its own transaction alongside writing `WorkflowHistory` and firing notifications.
- **Prompt 7 — Request Management Engine**: The core business engine. Atomic application-number generation (`Counter` collection + `$inc`, race-condition-safe under concurrent submissions), **transactional** Request creation from a FormSubmission (Request + initial WorkflowHistory + RequestActivity + FormSubmission back-link commit together or not at all — form submission auto-creates the request), stage transitions delegated to the Workflow Engine, denormalized customer/payment snapshots for query-free list filtering, Smart Search (instant exact-match on mobile via a dedicated index, text search on application number/name), public tracking by application number (no login), internal/customer/public comment visibility enforced at the query level, embedded per-request documents with verification status, bulk actions (`bulkWrite` for assign/cancel/tag, best-effort loop for approve/reject since each request may sit on a different workflow stage), single-aggregation dashboard stats.
- **Prompt 8 — Queue & Appointment System**: Two independent engines sharing the same atomic-counter pattern as application numbers. **Queue**: per-service config with multiple counters, daily token limits, priority-weighted call ordering (`{queue,tokenDate,status,priorityWeight,createdAt}` compound index returns the correct next-token with zero in-memory sort), atomic `findOneAndUpdate`-based "call next" so two counters clicking simultaneously never grab the same token, live-display endpoint (public, cache-ready at a 5-10s TTL). **Appointment**: configurable working hours/holidays/blocked dates per service, slot generation computed in-memory from a single aggregated booking-count query (not one DB round-trip per slot), booking-window and cut-off-hour enforcement, reschedule/cancel with the same capacity check as a fresh booking.
- **Prompt 9 — Payment & Billing Engine**: `Payment` is the append-only ledger (one row per transaction — advance/partial/full); `Request.paymentSummary` is a denormalized read-model kept in sync **transactionally** on every payment/refund, so it can never drift from the ledger. Service-level rules enforced server-side (`allowPartialPayment`/`allowFullPayment`), remaining-balance validation prevents overpayment. `Receipt` (per-payment) and `Invoice` (per-request, auto-generated on first access from the service's fee breakdown) both get atomic sequential numbers via the same `Counter` pattern as application numbers. QR codes are generated **on demand** (not stored) so they always point at the current tracking URL even if the domain changes later. Refunds validate against `amount - alreadyRefunded` per payment, not just the original amount, so double-refunding is impossible.
- **Prompt 10 — Notification & Automation Engine**: Event-driven, not a notification CRUD. `emitEvent()` is a fire-and-forget dispatcher — deliberately **not** backed by a persisted event log (at 10k+ concurrent users, writing a document for every login/stage-change/payment would be the single biggest write-amplification risk; only the *outcomes*, Notification and Reminder rows, are persisted). Admin-configurable `AutomationRule`s (IF event + conditions THEN actions) are evaluated by a pure engine against the event payload — no hardcoded automation. `NotificationTemplate`s support `{{variable}}` placeholders with sane built-in fallbacks so the system works before an admin customizes anything. Per-user `NotificationPreference` gates every send. A `Reminder` collection + `processDueReminders()` service is deliberately **not** self-scheduling (an in-process `setInterval` doesn't survive PM2 cluster mode or serverless) — it's a CLI job (`npm run job:reminders`) meant to be triggered by an external cron/PM2/CI schedule. Wired into the Request and Payment modules: request creation, stage changes, and payments now emit events that flow through this engine automatically.
- **Prompt 11 — CMS Engine**: `WebsiteSetting` deliberately consolidates what the spec lists as 7 separate singleton collections (WebsiteSetting/BusinessProfile/ThemeSetting/SeoSetting/ContactSetting/SocialLink/BusinessHour) into **one document** — every public page load needs the logo, theme colors, contact info, and SEO defaults together, so one query beats seven, and there's no relational reason to split config that always changes via the same admin screen. `Menu` embeds its item tree (same rationale as Category/Form/Workflow — a menu is always rendered whole) and the admin builder sends the whole edited tree back on save rather than diffing individual mutations. `Page` covers both regular and legal pages via a `type` enum instead of a separate LegalPage collection. `MediaAsset` is a searchable catalog layered over ImageKit (ImageKit stores the files; Mongo just makes them findable/reusable across banners, pages, and future modules). Every public read (`/cms/settings`, `/cms/menus/:location`, `/cms/banners/public`, `/cms/faqs/public`, `/cms/announcements/public`) is a strong Redis-cache candidate — flagged inline with suggested keys/TTLs.
- **Prompt 12 — Dashboard & Analytics Engine**: Pure read/aggregation layer over data every other module already writes — no new business data, only insight. KPI cards run five aggregations in parallel, each scoped to "today" first so they stay fast against existing indexes regardless of total history size. Historical trend charts read from `AnalyticsSnapshot` — one precomputed document per day, written once nightly (`npm run job:snapshot-analytics`, same non-self-scheduling CLI-job pattern as the reminder job) — rather than re-aggregating the full Request/Payment history on every dashboard load. Workflow bottleneck detection reuses `WorkflowHistory` (written by the Workflow/Request modules) to compute average time-per-stage and flag outliers. Per-user `DashboardWidget` layouts and shareable `SavedReport` configs are lightweight config documents. Excel export streams directly to the HTTP response via `ExcelJS.stream.xlsx.WorkbookWriter` instead of buffering the whole file in memory — matters once an export runs into the tens of thousands of rows.
- **Prompt 13 — DevOps & Deployment readiness**: Multi-stage `Dockerfile` (build stage compiles TypeScript with `tsc-alias` rewriting every `@config/*`-style import to a relative path, so the production stage — which installs *only* production dependencies — has zero runtime dependency on `tsconfig-paths`), runs as a non-root user, has a container-level `HEALTHCHECK`. `docker-compose.yml` wires up MongoDB **as a single-node replica set** (`mongo-init` runs `rs.initiate()` exactly once) because the transactional flows built throughout this codebase (request creation, payment recording, refunds) require one. `ecosystem.config.js` is the PM2 alternative — cluster mode across CPU cores, plus the reminder and analytics-snapshot jobs wired in via PM2's own `cron_restart` rather than an in-process timer. Dedicated `/health/live` (no dependency checks — for process restarts) vs `/health/ready` (checks MongoDB — for load-balancer routing decisions) endpoints, because conflating the two is a common cause of restart loops during brief DB blips. `scripts/backup.sh` / `restore.sh` wrap `mongodump`/`mongorestore` with retention cleanup. GitHub Actions: `ci.yml` lints/builds/validates the Docker build on every push; `deploy.yml` only fires on a version tag push, so a deploy is always a conscious, versioned action. A Postman collection (`docs/postman/`) covers a working end-to-end flow across every module. Full checklist and rollback/versioning strategy in `DEPLOYMENT.md`.

Every prompt from the original 18-module plan now has a working backend implementation.

## ⚡ Performance principles applied (and to keep applying in every future module)

- **`.lean()`** on every read-only list/detail query — skips Mongoose document hydration.
- **Explicit projections** (`.select()`) on list endpoints — never fetch full documents when a table view only needs a few fields.
- **Compound indexes** matched to actual query patterns (e.g. `{ category: 1, status: 1, sortOrder: 1 }`), not one index per field.
- **`bulkWrite`** for any "reorder N items" or bulk-action endpoint — one round trip instead of N.
- **Soft delete** (`deletedAt`) on entities referenced elsewhere (Service), so historical data (future Requests/Payments) never breaks.
- **DTO mappers** for public endpoints — smaller payloads, no internal field leakage, and a stable shape safe to cache.
- **Public list/detail endpoints are cache-ready**: comments mark exactly which Redis key + TTL + invalidation trigger to add when Redis is wired in (Prompt: Deployment/Redis module).
- Never cached: auth, OTP, payments, and anything request-status related — these must always read fresh from MongoDB.

## 📁 Folder Structure

```
src/
├── config/         # env, db, logger
├── models/         # Mongoose schemas (30+, one per collection across all modules)
├── controllers/    # Route handlers (business logic)
├── routes/         # Express routers, all mounted from routes/index.ts
├── middlewares/    # auth, rbac, security, validation, upload, error handling
├── services/       # engines: workflow, request, billing, queueEngine, appointmentEngine,
│                   # automationEngine, analyticsEngine, notificationDispatch, eventBus, email, imagekit
├── validators/     # Zod schemas, one per module
├── utils/          # ApiError, ApiResponse, asyncHandler, QR/Excel generation, template rendering
├── dto/            # response-shaping mappers for public/cache-friendly endpoints
├── types/          # shared TS types + Express request augmentation
├── jobs/           # CLI-invokable background jobs (reminders, analytics snapshot)
├── seeders/        # super admin seed script
├── app.ts          # Express app assembly
└── server.ts       # entry point, graceful shutdown

docker/nginx/        # reverse proxy config
docs/postman/         # Postman collection + environment
scripts/              # backup.sh, restore.sh
.github/workflows/    # CI + deploy
Dockerfile, docker-compose.yml, ecosystem.config.js   # deployment
DEPLOYMENT.md          # full deployment guide
```

## 🚀 Setup

```bash
cd csc-os-backend
npm install
cp .env.example .env
# edit .env with your real MongoDB URI, JWT secrets, Brevo key, ImageKit keys

npm run dev              # start dev server (http://localhost:5000)
npm run seed:super-admin # create the first Super Admin login
```

Health check: `GET http://localhost:5000/health`

## 🔑 First login

After running the seed script, log in with the credentials printed in the console
(defaults: `superadmin@cscos.local` / `ChangeMe@123` unless overridden in `.env`)
via `POST /api/v1/auth/login`, then **change the password immediately**.

## 📡 API Endpoints (this build)

### Auth — `/api/v1/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | Public | Register customer, sends OTP |
| POST | `/verify-otp` | Public | Verify email OTP |
| POST | `/resend-otp` | Public | Resend OTP |
| POST | `/login` | Public | Login, returns access token + refresh cookie |
| POST | `/refresh` | Cookie | Rotate access/refresh token |
| POST | `/logout` | Bearer | Revoke session |
| POST | `/forgot-password` | Public | Send reset link |
| POST | `/reset-password` | Public | Reset with token |
| POST | `/change-password` | Bearer | Change password (logged in) |
| GET | `/me` | Bearer | Current user |

### Categories — `/api/v1/categories`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/public` | Public | Nested active category tree (website) |
| GET | `/tree` | Admin | Nested full tree |
| GET | `/` | Admin | Paginated list with filters |
| POST | `/` | Admin | Create (multipart, field: `banner`) |
| PATCH | `/reorder` | Admin | Bulk sort order update |
| GET | `/:id` | Admin | Get one |
| PUT | `/:id` | Admin | Update (multipart, field: `banner`) |
| PATCH | `/:id/status` | Admin | Toggle active/inactive |
| DELETE | `/:id` | Super Admin | Delete (blocked if it has children) |

### Services — `/api/v1/services`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/public` | Public | Active + homepage-visible services, cache-ready |
| GET | `/featured` | Public | Featured services (homepage carousel) |
| GET | `/public/:slug` | Public | Service detail page |
| GET | `/` | Admin | Paginated, filtered (category/status/mode/featured), searched, sorted |
| POST | `/` | Admin | Create (multipart, field: `image`) |
| PATCH | `/reorder` | Admin | Bulk sort order update (`bulkWrite`) |
| GET | `/:id` | Admin | Get one (with category populated) |
| PUT | `/:id` | Admin | Update (multipart, field: `image`) |
| PATCH | `/:id/status` | Admin | Toggle active/inactive |
| PATCH | `/:id/featured` | Admin | Toggle featured |
| DELETE | `/:id` | Super Admin | Soft delete |

### Forms — `/api/v1/forms`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/public/:slug` | Public | Latest published version (calculated formulas stripped) |
| POST | `/public/:slug/submit` | Optional Bearer | Submit — validates, sanitizes, checks `unique` fields |
| GET | `/` | Admin | List — one row per form group (latest version only) |
| POST | `/` | Admin | Create (starts as draft v1) |
| GET | `/:id` | Admin | Full definition (all fields/sections) |
| PUT | `/:id` | Admin | Edit — mutates in place if draft; **forks a new version if published** |
| PATCH | `/:id/publish` | Admin | Publish (archives any previously-published version in the group) |
| POST | `/:id/clone` | Admin | Duplicate as a brand-new form group |
| GET | `/:id/submissions` | Admin | Paginated submissions across all versions of this form |
| DELETE | `/:id` | Super Admin | Soft delete |

**Architecture note — why fields are embedded, not a separate collection:** rendering a form requires every field in one shot; embedding avoids an N+1 query and keeps versioning atomic (a version is a single immutable document). If a form ever needs 1000+ fields (unlikely for CSC use cases), this is the point to reconsider — MongoDB's 16MB document limit is the ceiling, but a realistic form (50-100 fields) is a few KB.

### Workflows — `/api/v1/workflows`  (all routes require Admin/Super Admin auth — internal only)
| Method | Path | Description |
|---|---|---|
| GET | `/templates` | Pre-built starting templates (static, not DB-backed) |
| GET | `/history/:requestId` | Full stage-transition timeline for a request |
| GET | `/` | List, filtered by service/status, paginated |
| POST | `/` | Create (draft) — unsets any prior default for the service if `isDefault: true` |
| GET | `/:id` | Full definition (stages + transitions) |
| PUT | `/:id` | Update in place, bumps `version` |
| PATCH | `/:id/publish` | Publish |
| POST | `/:id/duplicate` | Clone as a new draft |
| PATCH | `/:id/stages/reorder` | Bulk reorder stages |
| GET | `/:id/transitions?fromStage=x` | Action buttons available to the caller's role |
| POST | `/:id/validate-transition` | Dry-run a transition (role, requirements) without moving anything |
| DELETE | `/:id` | Soft delete (blocked if it's the service's default workflow) |

**Architecture note — why the engine has no database dependency:** `workflowEngine.service.ts` takes a workflow object and a `TransitionContext` (plain booleans: `paymentCompleted`, `documentsVerified`, etc.) and returns a decision — it never queries Payment/Document/Queue collections itself. The Request Management module (next) supplies that context after its own lookups, then performs the actual stage-move, `WorkflowHistory` write, and notification dispatch together in one transaction. This keeps the engine testable in isolation and avoids a circular dependency between modules that don't exist yet.

### Requests — `/api/v1/requests`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/track/:applicationNumber` | Public | Status + customer-visible timeline, no login |
| GET | `/my` | Customer | Own request history |
| GET | `/:id` | Customer (own) / Staff+ | Full detail |
| POST | `/:id/comments` | Customer (own) / Staff+ | Add a note — customers forced to `customer` visibility |
| GET | `/:id/comments` | Customer (own) / Staff+ | Internal notes filtered out for customers at query level |
| POST | `/:id/documents` | Customer (own) / Staff+ | Upload (multipart, field: `file`) |
| GET | `/` | Staff+ | Admin queue — filter/search/sort/paginate |
| GET | `/stats` | Staff+ | Dashboard counts via single `$facet` aggregation |
| GET | `/:id/activity` | Staff+ | Internal audit trail |
| PATCH | `/:id/stage` | Staff+ | Move stage via the Workflow Engine |
| PATCH | `/:id/priority` | Staff+ | Change priority |
| PATCH | `/:id/documents/:docId/verify` | Staff+ | Verify/reject an uploaded document |
| POST | `/bulk` | Staff+ | assign / cancel / tag / approve / reject across up to 200 requests |
| PATCH | `/:id/assign` | Admin/Super Admin | Assign to a staff member |

**⚠️ MongoDB replica set required for transactions:** `createRequestFromSubmission` (called automatically inside `POST /forms/public/:slug/submit`) uses a MongoDB session transaction so the Request, WorkflowHistory, RequestActivity, and FormSubmission update commit atomically. MongoDB Atlas is a replica set by default — no action needed. For **local development**, a standalone `mongod` does not support transactions; run one of:
```bash
# Option A — single-node replica set (simplest for local dev)
mongod --replSet rs0 --dbpath /path/to/data
# then, once, from a mongo shell:
rs.initiate()
```
```bash
# Option B — Docker
docker run -d -p 27017:27017 mongo:7 --replSet rs0
docker exec -it <container> mongosh --eval "rs.initiate()"
```
If a submission fails to create its Request due to a missing workflow config, the submission itself still succeeds (customer data isn't lost) and the error is logged for an admin to fix the service's workflow — the request can be created later once configured.

### Queue — `/api/v1/queue`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/current?service=x` | Public | Live now-serving/waiting count for the TV display |
| POST | `/token` | Any logged-in user | Generate a token |
| PATCH | `/token/:id/cancel` | Owner / Staff+ | Cancel a token |
| POST | `/config` | Staff+ | Create/update queue settings (upsert) |
| GET | `/config/:service` | Staff+ | Get queue settings |
| PATCH | `/token/call` | Staff+ | Atomically claim the next waiting token for a counter |
| PATCH | `/token/:id/recall` \| `/skip` \| `/complete` | Staff+ | Token lifecycle actions |
| GET | `/tokens` | Staff+ | Paginated list, filter by date/status/service |
| GET | `/analytics` | Staff+ | Status breakdown, per-counter completed count, avg wait time |

### Appointments — `/api/v1/appointments`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/slots?service=x&date=y` | Public | Available slots with remaining capacity |
| POST | `/` | Any logged-in user | Book a slot |
| GET | `/my` | Customer | Own bookings |
| PATCH | `/:id/reschedule` \| `/cancel` | Owner (cutoff-enforced) / Staff+ | Change or cancel a booking |
| POST | `/settings` | Staff+ | Create/update per-service settings (upsert) |
| GET | `/settings/:service` | Staff+ | Get settings |
| GET | `/` | Staff+ | Admin calendar/list view |
| PATCH | `/:id/status` | Staff+ | Confirm / in-progress / completed / no-show |

### Payments — `/api/v1/payments`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/:id` | Owner / Staff+ | Payment detail |
| GET | `/:id/receipt` | Owner / Staff+ | Receipt + on-demand QR (points to public tracking) |
| GET | `/request/:requestId/invoice` | Owner / Staff+ | Invoice (auto-generated on first access) + QR |
| POST | `/` | Staff+ | Record a payment (advance/partial/full) |
| GET | `/` | Staff+ | List, filter by request/customer/status/method/date |
| GET | `/stats` | Staff+ | Collection totals — overall, by method, by day |
| POST | `/:id/refund` | Staff+ | Process a refund against a specific payment |

**Architecture note — why Payment, Receipt, and Invoice are three separate collections instead of one:** `Payment` is the immutable transaction ledger (source of truth — one row per money movement). `Receipt` is a 1:1 printable artifact per payment. `Invoice` is 1:1 per request and represents the total bill, independent of how many payments settle it. Keeping them separate means a request with an advance + a final payment produces one invoice but two receipts — matching how a real CSC counter actually operates — without any collection needing to model a one-to-many relationship awkwardly.

### Notifications — `/api/v1/notifications`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Any logged-in user | Own notifications, paginated |
| GET | `/unread-count` | Any logged-in user | Badge count |
| PATCH | `/:id/read` \| `/read-all` | Any logged-in user | Mark read |
| DELETE | `/:id` | Any logged-in user | Delete |
| GET / PUT | `/preferences` | Any logged-in user | Channel opt-in/opt-out |
| POST / GET / PUT / DELETE | `/rules` | Admin | Automation rule CRUD |
| POST / GET | `/templates` | Admin | Notification template upsert/list |

**Events currently emitted** (see `EVENT_TYPES` in `automationRule.model.ts` for the full extensible list): `request.created`, `request.stage_changed`, `request.completed` (from Request Management), `payment.received` (from Payment & Billing). Every event payload includes `userId` at minimum — admin rule conditions and template variables can reference any other field the emitting module includes (e.g. `applicationNumber`, `stageName`, `amount`).

**Running the reminder job:**
```bash
npm run job:reminders        # run once, manually or from cron/PM2/CI
```

### CMS — `/api/v1/cms`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/settings` | Public | Site config (identity, theme, contact, SEO, hours) — cache candidate `cms:settings`, TTL ~5min |
| GET | `/menus/:location` | Public | header / footer / sidebar tree |
| GET | `/pages/public/:slug` | Public | Published page (About, Contact, legal, custom) |
| GET | `/banners/public` | Public | Active banners within schedule |
| GET | `/faqs/public` | Public | Active FAQs, filter by category/service/search |
| GET | `/announcements/public` | Public | Active announcements within date range, pinned first |
| PUT | `/settings` | Admin | Update site config |
| PATCH | `/settings/maintenance` | Admin | Toggle maintenance mode |
| GET / PUT | `/menus` | Admin | List all menus / save a location's whole tree |
| POST / GET / PUT / DELETE | `/pages` | Admin | Page CRUD |
| POST / GET / PUT / DELETE | `/banners` | Admin | Banner CRUD (multipart, field: `image`) |
| POST / GET / PUT / DELETE | `/faqs` | Admin | FAQ CRUD |
| POST / GET / PUT / DELETE | `/announcements` | Admin | Announcement CRUD |
| POST / GET / DELETE | `/media` | Admin | Upload to ImageKit + searchable catalog |

### Dashboard — `/api/v1/dashboard`  (all routes require Staff+ auth)
| Method | Path | Description |
|---|---|---|
| GET | `/kpi` | Today's revenue, pending/completed requests, new customers, queue/appointment counts, avg processing time |
| GET | `/analytics/requests?dateFrom&dateTo` | By status, by date, top services, approval/rejection rate |
| GET | `/analytics/customers?dateFrom&dateTo` | Growth over time, returning vs one-time |
| GET | `/analytics/services` | Top/least-used services with revenue |
| GET | `/analytics/workflow?workflow=x` | Avg time per stage + bottleneck flags |
| GET | `/analytics/revenue-trend?dateFrom&dateTo` | Reads precomputed `AnalyticsSnapshot` (fast path for long ranges) |
| GET / PUT | `/widgets` | Per-user dashboard layout |
| POST / GET / DELETE | `/reports` | Saved report configs (own + shared) |
| GET | `/export/requests` | Streams an `.xlsx` file |

**Running the snapshot job:**
```bash
npm run job:snapshot-analytics              # snapshots yesterday (default)
npm run job:snapshot-analytics -- 2026-08-01  # backfill a specific date
```

## 🚀 Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full guide (environment checklist, health check wiring, backup/restore, release/rollback strategy). Quickstart:

```bash
# Docker Compose — MongoDB (replica set), API, Nginx, all wired together
cp .env.example .env   # fill in real secrets first
docker compose up -d --build
docker compose exec app npm run seed:super-admin
```

```bash
# PM2 on a VPS (with MongoDB Atlas)
npm ci && npm run build
pm2 start ecosystem.config.js --env production
```

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build — compiles TS, ships only production deps, non-root user |
| `docker-compose.yml` | App + MongoDB (auto-initialized replica set) + Nginx |
| `docker/nginx/nginx.conf` | Reverse proxy, gzip, security headers, edge rate limiting |
| `ecosystem.config.js` | PM2 cluster mode + cron-scheduled background jobs |
| `.github/workflows/ci.yml` | Lint + build + Docker build validation on every push/PR |
| `.github/workflows/deploy.yml` | Builds & pushes the image on a version tag |
| `scripts/backup.sh` / `restore.sh` | `mongodump`/`mongorestore` with retention cleanup |
| `docs/postman/` | Postman collection + environment covering every module |

## 🗺️ Project status

Every module from the original plan has a working backend implementation: Foundation, Auth, Category Builder, Service Builder, Form Builder, Workflow Engine, Request Management, Queue & Appointment, Payment & Billing, Notification & Automation, CMS, Dashboard & Analytics, and DevOps readiness. What's intentionally **not** included yet (natural next steps, not gaps in what was asked): the frontend, an automated test suite (Vitest/Supertest — the folder structure and CI hook are ready for it), Swagger/OpenAPI generation, and Redis (every cache-worthy endpoint is already flagged inline with a suggested key/TTL for when it's wired in).

Follow this exact pattern for every future module:
1. `src/models/service.model.ts`
2. `src/validators/service.validator.ts`
3. `src/controllers/service.controller.ts`
4. `src/routes/service.routes.ts`
5. Mount it in `src/routes/index.ts`

## 🔒 Security baked in

Helmet, CORS (locked to `CLIENT_URL`), global + per-route rate limiting, Mongo sanitize, XSS clean, HPP, bcrypt (12 rounds), JWT rotation with `tokenVersion` revocation, account lockout after 5 failed attempts, audit logging on every sensitive action.
