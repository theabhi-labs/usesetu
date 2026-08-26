# UseSetu SaaS — Disaster Recovery & Business Continuity Plan

## 1. Disaster Classification & Recovery Objectives

| Metric | Target | Description |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **< 1 hour** | Maximum acceptable data loss window during catastrophic infrastructure failure. |
| **Recovery Time Objective (RTO)** | **< 30 minutes** | Maximum acceptable downtime to restore read/write API traffic. |

---

## 2. Emergency Escalation Matrix

| Scenario | Severity | Initial Action | Owner |
| :--- | :--- | :--- | :--- |
| **MongoDB Cluster Outage** | P0 | Check replica set primary election, failover to secondary, verify connection pool. | Lead SRE |
| **Complete API Downtime** | P0 | Restart PM2 cluster, check reverse proxy error logs (`502 Bad Gateway`). | Platform Engineer |
| **Razorpay API Outage** | P1 | Enable payment degraded banner, check Razorpay status dashboard, queue webhooks. | Billing Lead |
| **Webhook Delivery Delay** | P1 | Trigger on-demand reconciliation: `POST /api/v1/platform/applications/:id/billing/reconcile`. | Billing Lead |
| **Custom Domain SSL Failure** | P2 | Re-trigger SSL issuance or fallback to default domain (`*.usesetu.com`). | Infrastructure SRE |
| **Background Job Crash** | P2 | Check `JobExecution` logs in `/admin/operations/jobs` and run manual lifecycle sync. | Operations Engineer |

---

## 3. Disaster Response Runbooks

### 3.1 Scenario A: Total Database Node Failure & Restoration
1. **Provision New MongoDB Instance** (or initiate Atlas failover).
2. **Execute Database Restore from Latest Gzip Archive**:
   ```bash
   mongorestore --uri="$MONGO_URI" --gzip --archive="/backups/latest-backup.gz" --drop
   ```
3. **Verify Index Integrity**:
   - Unique compound indexes on `applications`, `subscriptions`, and `paymenttransactions`.
4. **Reboot API Servers**:
   ```bash
   pm2 restart all
   ```
5. **Verify Health Endpoint**:
   ```bash
   curl -I http://localhost:5000/health/ready
   # Must return HTTP 200 { status: "ready" }
   ```

### 3.2 Scenario B: Razorpay Webhook Secret Compromise / Rotation
1. Generate new Webhook Secret in Razorpay Dashboard.
2. Update `RAZORPAY_WEBHOOK_SECRET` in production `.env`.
3. Reload server instances: `pm2 reload all --update-env`.
4. Run self-healing reconciliation to recover any missed transactions during rotation window.

### 3.3 Scenario C: Broken Application Build in Production
1. Immediately switch traffic to secondary container/cluster or rollback commit:
   ```bash
   git checkout <PREVIOUS_TAG> && npm ci && npm run build && pm2 reload all
   ```
2. Verify `/health/live` returns HTTP 200.
