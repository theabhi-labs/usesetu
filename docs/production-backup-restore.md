# UseSetu SaaS — Production Backup & Restore Guide

## 1. Overview & Recovery Objectives
This document establishes the official backup, recovery, and point-in-time disaster recovery strategy for the UseSetu multi-tenant SaaS platform.

### Key Targets:
- **Recovery Point Objective (RPO)**: < 1 hour (Continuous oplog replication or automated hourly snapshots).
- **Recovery Time Objective (RTO)**: < 30 minutes for core API restoration; < 2 hours for full database restoration.

---

## 2. Backup Architecture

### 2.1 Automated Snapshot Backups (MongoDB Atlas / Managed Cluster)
For managed production clusters:
- Automated continuous snapshots every 6 hours with 30-day retention.
- Oplog tailing enabled for Point-in-Time Recovery (PITR) down to the exact second.

### 2.2 Cold Logical Backups (`mongodump`)
For standalone or secondary archival:
```bash
# Full compressed archive with gzip
mongodump --uri="$MONGO_URI" --gzip --archive="/backups/usesetu-backup-$(date +%Y%m%d_%H%M%S).gz"
```

### 2.3 Retention Policy
- Hourly/Daily backups: 14 days
- Weekly backups: 8 weeks
- Monthly backups: 12 months
- Billing/Financial Transactions (`paymenttransactions`, `billinginvoices`, `subscriptionauditlogs`): Retained indefinitely for legal compliance.

---

## 3. Restore Procedures

### 3.1 Restoring from Compressed Archive (`mongorestore`)
```bash
# Dry run verification (does not write data)
mongorestore --uri="$MONGO_URI" --gzip --archive="/backups/usesetu-backup-YYYYMMDD_HHMMSS.gz" --dryRun

# Full restore (drops existing collections to ensure exact state match)
mongorestore --uri="$MONGO_URI" --gzip --archive="/backups/usesetu-backup-YYYYMMDD_HHMMSS.gz" --drop
```

### 3.2 Restoring a Specific Collection (e.g. Subscriptions)
```bash
mongorestore --uri="$MONGO_URI" --gzip --archive="/backups/usesetu-backup-YYYYMMDD_HHMMSS.gz" --nsInclude="usesetu.subscriptions" --drop
```

---

## 4. Post-Restore Verification Checklist
1. **Liveness & Readiness**:
   - `GET /health/live` returns HTTP 200 `{ status: "alive" }`.
   - `GET /health/ready` returns HTTP 200 `{ status: "ready", dependencies: { mongodb: "connected" } }`.
2. **Index Synchronization**:
   - Run index synchronizer to ensure partial unique indexes (e.g. `{ applicationId: 1, status: { $in: ['active', 'trialing', 'past_due'] } }`) are intact.
3. **Billing Reconciliation**:
   - Execute `BillingLifecycleService.runAutomatedLifecycleCycle()` to ensure state-machine integrity.
4. **Data Isolation Audit**:
   - Verify tenant and account queries return strictly isolated records.
