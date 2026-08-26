# UseSetu SaaS — Production Deployment & Go-Live Runbook

## 1. Prerequisites & Infrastructure Specifications

| Requirement | Production Target | Minimum Specification |
| :--- | :--- | :--- |
| **Node.js** | v20.x or v22.x LTS | v18.18+ |
| **MongoDB** | MongoDB 6.0+ or MongoDB Atlas (Replica Set) | Standalone Replica Set with Oplog |
| **Reverse Proxy** | Nginx / Caddy / Cloudflare Enterprise | HTTP/2 & WebSockets support |
| **Process Manager** | PM2 Cluster Mode or Docker / Kubernetes | 2+ cluster instances |
| **Payment Gateway** | Razorpay (Active Live Account) | Key ID, Key Secret, Webhook Secret |

---

## 2. Zero-Downtime Deployment Sequence

```
1. PRE-DEPLOYMENT:
   ├── Snapshot database (mongodump or Atlas snapshot)
   ├── Validate required production environment variables
   └── Verify current health status (`GET /health/ready` -> 200)

2. DEPLOYMENT BUILD:
   ├── `git pull origin main`
   ├── `npm ci --production=false`
   ├── `npm run build`
   ├── `cd frontend && npm ci && npm run build && cd ..`
   └── Run non-destructive database index synchronization (`npm run seed:super-admin`)

3. ROLLING RESTART:
   ├── `pm2 reload ecosystem.config.js --update-env` (Zero-downtime rolling worker restart)
   └── Run smoke health checks:
       ├── `GET /health/live` -> 200
       └── `GET /health/ready` -> 200

4. POST-DEPLOYMENT VERIFICATION:
   ├── Check `/admin/operations/overview` on Super Admin console
   ├── Verify Razorpay webhook delivery status
   └── Run background job check: `BillingLifecycleService.runAutomatedLifecycleCycle()`
```

---

## 3. Reverse Proxy & Custom Domain Routing Architecture

### 3.1 Nginx Ingress Configuration
```nginx
# Upstream Node.js API Cluster
upstream usesetu_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

# Platform Primary Domain & Wildcard Tenant Resolution
server {
    listen 443 ssl http2;
    server_name usesetu.com *.usesetu.com;

    ssl_certificate /etc/letsencrypt/live/usesetu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/usesetu.com/privkey.pem;

    # Forward client headers for tenantResolver and security audit
    location / {
        proxy_pass http://usesetu_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
        proxy_read_timeout 60s;
    }
}

# Custom Domain Dynamic Ingress
server {
    listen 443 ssl http2 default_server;
    server_name _;

    # Dynamic SSL certificate resolution via Let's Encrypt / On-demand TLS (Caddy/OpenResty)
    ssl_certificate /etc/ssl/custom-domains/fallback.crt;
    ssl_certificate_key /etc/ssl/custom-domains/fallback.key;

    location / {
        proxy_pass http://usesetu_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Rollback Procedure

If critical regressions or P0 outages are detected immediately post-deployment:
1. **Revert Git Commit**:
   ```bash
   git reset --hard <PREVIOUS_STABLE_COMMIT_HASH>
   npm ci
   npm run build
   cd frontend && npm run build && cd ..
   ```
2. **Reload Processes**:
   ```bash
   pm2 reload all --update-env
   ```
3. **Validate Restored Version**:
   ```bash
   curl -s http://localhost:5000/health | jq .
   ```
