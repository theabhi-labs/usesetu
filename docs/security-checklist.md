# UseSetu SaaS — Production Security Audit & Verification Checklist

## 1. Security Architecture Summary

```
                       [ Incoming Request ]
                                │
                                ▼
               [ Helmet Security HTTP Headers ]
         (HSTS, CSP, X-Frame-Options, XSS Protection)
                                │
                                ▼
               [ Rate Limiters & Request Throttling ]
        (General API: 100/15m, Auth: 10/15m, Webhooks: 200/15m)
                                │
                                ▼
               [ Input Sanitization & Anti-Injection ]
           (express-mongo-sanitize, XSS, HPP, Body limits)
                                │
                                ▼
               [ Tenant & Domain Resolution Middleware ]
         (Resolves Hostname -> Application -> Enforces Tenant ID)
                                │
                                ▼
                 [ JWT Authentication & RBAC Gate ]
         (Verifies Token, Revocation Version, Tenant Alignment)
                                │
                                ▼
               [ Fail-Closed Tenant Plugin Scoping ]
         (Every MongoDB query filtered by { tenantId: req.tenantId })
                                │
                                ▼
            [ Structured Logger with Secret Redaction ]
        (Passkeys, OTPs, CVVs, Tokens, JWTs recursively masked)
```

---

## 2. Production Security Controls Matrix

| Control Category | Implementation Details | Status |
| :--- | :--- | :--- |
| **Authentication** | Strong password hashing (Bcrypt 10 rounds), lockout after 5 failed attempts (30m cooldown), tokenVersion revocation. | `VERIFIED` |
| **Authorization & RBAC** | Explicit role gates (`Role.SUPER_ADMIN`, `Role.ADMIN`, `Role.STAFF`, `Role.CUSTOMER`). Super admin operations isolated. | `VERIFIED` |
| **Tenant Isolation** | `tenantPlugin` injects `{ tenantId }` into all Mongoose queries/mutations. Query aggregation protection enabled. | `VERIFIED` |
| **Account Boundary** | Account ownership verified on all `/api/v1/platform/*` mutations. Cross-account access returns 403 Forbidden. | `VERIFIED` |
| **Host vs JWT Matching** | If incoming request host resolves to Tenant A, but user JWT belongs to Tenant B, request is terminated (403). | `VERIFIED` |
| **Payment Security** | Server-side price calculation only. Razorpay HMAC SHA-256 webhook cryptographic signature verification. | `VERIFIED` |
| **Sensitive Data Exposure** | `LoggerService` recursively redacts secrets. Error handler strips stack traces in production. | `VERIFIED` |
| **Rate Limiting** | Rate limiters return HTTP 429 and `Retry-After` header. Abuse events logged to `SecurityEvent`. | `VERIFIED` |
| **Injection Defense** | `express-mongo-sanitize` strips `$` and `.` operators. Mongoose schema strict type casting. | `VERIFIED` |
| **Data Safety & Retention** | Zero hard-deletion of payment, invoice, or audit logs. Soft status transitions across lifecycle. | `VERIFIED` |
