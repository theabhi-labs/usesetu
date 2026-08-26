# UseSetu SaaS — Razorpay Billing & Operational Manual

## 1. Single Payment Gateway Mandate
UseSetu operates **exclusively with Razorpay** for Indian SaaS billing compliance.
- No secondary gateways (Stripe, Cashfree, PayPal, PhonePe, Paytm) are integrated or supported.
- UPI and NetBanking incur no customer surcharge.
- Server-side pricing calculation guarantees client requests cannot manipulate plan amounts or billing cycles.

---

## 2. Payment State Machine & Transitions

```
[ CHECKOUT INITIATED ]
        │
        ▼
   ( CREATED )
        │
        ├──► ( payment.failed ) ──────► [ FAILED ]
        │                                  │
        │                                  └──► ( late payment.captured ) ──► [ CAPTURED ]
        │
        └──► ( payment.captured ) ────► [ CAPTURED ]
                                           │
                                           ├──► ( partial refund ) ──────────► [ PARTIALLY_REFUNDED ]
                                           │
                                           └──► ( full refund ) ─────────────► [ REFUNDED ]
```

---

## 3. Webhook Delivery & Idempotency Rules

1. **Cryptographic Validation**:
   - Webhook requests verify `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET` using raw request buffers.
2. **Idempotent Ingestion**:
   - `PaymentWebhookEvent` records `eventId`. Duplicate deliveries are flagged as `DUPLICATE` without re-executing subscription mutations or invoice generation.
3. **Out-of-Order Delivery**:
   - If a `payment.captured` event arrives after a temporary failure or network timeout, the state machine transitions the transaction from `FAILED` to `CAPTURED` and immediately activates the subscription.

---

## 4. Automated Subscription Lifecycle & Grace Periods

1. **Active**: Full commercial quotas and features unlocked.
2. **Renewal Reminders**: Automated notifications dispatched at 7 days, 3 days, and 1 day before expiration.
3. **Past Due (7-Day Grace Period)**:
   - When a renewal payment fails or subscription expires, the status shifts to `PAST_DUE`.
   - The application remains fully accessible during the 7-day grace window while dunning alerts are delivered.
4. **Expired (Fallback to Free Tier)**:
   - When the grace period ends without payment, the subscription transitions to `EXPIRED`.
   - The application automatically falls back to Free plan entitlements.
   - **Zero Data Loss Guarantee**: Customer, application, and tenant records are NEVER deleted upon expiration.
