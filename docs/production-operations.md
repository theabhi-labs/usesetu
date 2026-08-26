# UseSetu SaaS — Production Operations Runbook & Observability Manual

## 1. Observability Architecture

```
HTTP Request / Webhook / Job
        │
        ▼
[ requestContextMiddleware ] (Attaches X-Request-ID)
        │
        ▼
[ metricsMiddleware ] (Records latency, status, P50/P95/P99)
        │
        ▼
[ App / Service Logic ] (Structured logging via LoggerService with automatic secret redaction)
        │
        ▼
[ errorHandler ] (Normalizes error, redacts stacks in prod, tracks in SystemError)
        │
        ▼
[ AlertService & SystemIncident ] (P0–P3 incidents, auto-deduplication, Super Admin dashboard)
```

---

## 2. Health & Diagnostic Endpoints

| Endpoint | Auth Required | Purpose |
| :--- | :--- | :--- |
| `GET /health` | Public | Process status, uptime, service name, version. |
| `GET /health/live` | Public | Container orchestrator liveness probe (Zero DB dependency). |
| `GET /health/ready` | Public | Readiness probe (Returns 503 if MongoDB is disconnected). |
| `GET /health/deep` | `SUPER_ADMIN` | Comprehensive telemetry: DB ping latency, heap memory, API metrics. |

---

## 3. Incident Classification & Escalation Matrix

### **P0: Critical Outage (Immediate Intervention)**
- **Conditions**: Database down (`ready` returning 503), entire API unresponsive, payment infrastructure outage.
- **Action**: Check MongoDB connection pool, inspect container health, trigger failover replica.

### **P1: Major Degradation (Response < 15 mins)**
- **Conditions**: High webhook failure spike, background job recurring failures, database latency > 500ms.
- **Action**: Check Razorpay webhook signing secrets, inspect slow query logs, review `JobExecution` errors in Super Admin console.

### **P2: Elevated Error Rate (Response < 1 hour)**
- **Conditions**: 5xx error rate > 5%, API P95 latency > 800ms, repeated custom domain DNS failures.
- **Action**: Review grouped error fingerprints in `/admin/operations/errors`, check DNS nameserver responses.

### **P3: Operational Warning (Response within Business Hours)**
- **Conditions**: Application quota warnings, isolated rate-limit hits, individual domain renewal warnings.
- **Action**: Monitor via `/admin/operations` and notify affected accounts if needed.

---

## 4. Operational Incident Runbooks

### Runbook A: Database Latency Spike (> 500ms)
1. Navigate to `/admin/operations` and check Database Health widget.
2. If status is `critical`, check MongoDB cluster CPU and active connection count.
3. Review `/admin/operations/metrics` to find the slowest query routes.
4. If necessary, execute index synchronization: `npm run seed:super-admin` or collection index rebuild.

### Runbook B: Razorpay Webhook Outage / Backlog
1. Check `/admin/operations/billing-health` for Webhook Success Rate.
2. If `failedCount` is rising, check server logs for `WEBHOOK_SIGNATURE_FAILED` security events.
3. Verify `RAZORPAY_WEBHOOK_SECRET` environment configuration.
4. Execute on-demand payment reconciliation via platform billing endpoint.

### Runbook C: Background Job Failures
1. Navigate to `/admin/operations/jobs`.
2. Inspect the failed job row and read `lastError` and `durationMs`.
3. Check if transient network/database timeout caused failure.
4. Trigger manual lifecycle run: `POST /api/v1/platform/applications/:id/billing/lifecycle/run`.
