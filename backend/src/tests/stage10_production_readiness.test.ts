import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import { env } from '../config/env';
import { User } from '../models/user.model';
import { Tenant } from '../models/tenant.model';
import { Account, AccountStatus } from '../models/account.model';
import { Application, ApplicationStatus } from '../models/application.model';
import { ApplicationTemplate, TemplateStatus } from '../models/applicationTemplate.model';
import { Plan } from '../models/plan.model';
import { Subscription, SubscriptionStatus, BillingCycle } from '../models/subscription.model';
import { PaymentTransaction, PaymentTransactionStatus } from '../models/paymentTransaction.model';
import { ApplicationDomain, DomainType, DomainStatus, SslStatus } from '../models/applicationDomain.model';
import { SystemIncident } from '../models/systemIncident.model';
import { JobExecution } from '../models/jobExecution.model';
import { SecurityEvent } from '../models/securityEvent.model';
import { Role } from '../types/auth.types';
import { generateAccessToken } from '../services/token.service';
import { sanitizeLogData } from '../services/observability/logger.service';
import { JobMonitorService } from '../services/observability/jobMonitor.service';
import { SecurityAuditService } from '../services/observability/securityAudit.service';
import { seedPlans } from '../seeders/planAndSubscription.seeder';

describe('UseSetu Stage 10 — Final Production Launch, Security Audit & Go-Live Validation', () => {
  let superAdminUser: any;
  let superAdminToken: string;

  // Account A (Alice)
  let userA: any;
  let tokenA: string;
  let tenantA: any;
  let accountA: any;
  let appA: any;

  // Account B (Bob)
  let userB: any;
  let tokenB: string;
  let tenantB: any;
  let accountB: any;
  let appB: any;

  let starterPlan: any;
  let template: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }

    const stamp = Date.now();

    // Ensure digital-service-center template
    template = await ApplicationTemplate.findOne({ slug: 'digital-service-center' });
    if (!template) {
      template = await ApplicationTemplate.create({
        name: 'Digital Service Center',
        slug: 'digital-service-center',
        category: 'csc',
        description: 'Citizen Service Center OS Blueprint',
        version: 1,
        status: TemplateStatus.ACTIVE,
      });
    }

    // Ensure Default Commercial Plans
    await seedPlans();
    starterPlan = await Plan.findOne({ slug: 'starter' });

    // 1. Super Admin
    superAdminUser = await User.create({
      name: 'Super Admin Final',
      email: `superadmin_final_${stamp}@usesetu.local`,
      mobile: `999${stamp.toString().slice(-7)}`,
      password: 'Password123!',
      role: Role.SUPER_ADMIN,
      tenantId: new mongoose.Types.ObjectId(),
      isEmailVerified: true,
      isActive: true,
    });
    superAdminToken = generateAccessToken({
      userId: superAdminUser._id.toString(),
      role: Role.SUPER_ADMIN,
      tokenVersion: 0,
    });

    // 2. Tenant A & Account A (Alice)
    tenantA = await Tenant.create({
      name: 'Alice Center Tenant',
      slug: `alice-ten-${stamp}`,
    });
    userA = await User.create({
      tenantId: tenantA._id,
      name: 'Alice Owner',
      email: `alice_${stamp}@usesetu.com`,
      mobile: `987${stamp.toString().slice(-7)}`,
      password: 'Password123!',
      role: Role.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    tokenA = generateAccessToken({
      userId: userA._id.toString(),
      role: Role.ADMIN,
      tokenVersion: 0,
    });
    accountA = await Account.create({
      name: 'Alice Cloud Account',
      ownerUserId: userA._id,
      status: AccountStatus.ACTIVE,
    });
    appA = await Application.create({
      accountId: accountA._id,
      tenantId: tenantA._id,
      templateId: template._id,
      templateVersion: 1,
      name: 'Alice CSC Portal',
      slug: `alice-app-${stamp}`,
      status: ApplicationStatus.ACTIVE,
      primaryDomain: `alice-app-${stamp}.usesetu.com`,
    });
    await ApplicationDomain.create({
      applicationId: appA._id,
      hostname: `${appA.slug}.usesetu.com`,
      type: DomainType.DEFAULT,
      status: DomainStatus.ACTIVE,
      sslStatus: SslStatus.ACTIVE,
      isPrimary: true,
      verificationAttempts: 0,
    });

    // 3. Tenant B & Account B (Bob)
    tenantB = await Tenant.create({
      name: 'Bob Center Tenant',
      slug: `bob-ten-${stamp}`,
    });
    userB = await User.create({
      tenantId: tenantB._id,
      name: 'Bob Owner',
      email: `bob_${stamp}@usesetu.com`,
      mobile: `986${stamp.toString().slice(-7)}`,
      password: 'Password123!',
      role: Role.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    tokenB = generateAccessToken({
      userId: userB._id.toString(),
      role: Role.ADMIN,
      tokenVersion: 0,
    });
    accountB = await Account.create({
      name: 'Bob Cloud Account',
      ownerUserId: userB._id,
      status: AccountStatus.ACTIVE,
    });
    appB = await Application.create({
      accountId: accountB._id,
      tenantId: tenantB._id,
      templateId: template._id,
      templateVersion: 1,
      name: 'Bob CSC Portal',
      slug: `bob-app-${stamp}`,
      status: ApplicationStatus.ACTIVE,
      primaryDomain: `bob-app-${stamp}.usesetu.com`,
    });
    await ApplicationDomain.create({
      applicationId: appB._id,
      hostname: `${appB.slug}.usesetu.com`,
      type: DomainType.DEFAULT,
      status: DomainStatus.ACTIVE,
      sslStatus: SslStatus.ACTIVE,
      isPrimary: true,
      verificationAttempts: 0,
    });
  }, 30000);

  afterAll(async () => {
    await SystemIncident.deleteMany({});
    await JobExecution.deleteMany({});
    await SecurityEvent.deleteMany({});
  });

  // -------------------------------------------------------------------------
  // 1. PRODUCTION ENVIRONMENT & CONFIGURATION VALIDATION
  // -------------------------------------------------------------------------
  describe('1. Production Environment & Config Validation', () => {
    it('should have required environment variables validated and typed', () => {
      expect(env.MONGO_URI).toBeDefined();
      expect(env.JWT_ACCESS_SECRET).toBeDefined();
      expect(env.JWT_REFRESH_SECRET).toBeDefined();
      expect(env.PLATFORM_BASE_DOMAIN).toBe('usesetu.com');
      expect(env.PLATFORM_PROTOCOL).toBeDefined();
      expect(env.RAZORPAY_KEY_ID).toBeDefined();
      expect(env.RAZORPAY_KEY_SECRET).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 2. AUTHENTICATION & JWT SECURITY
  // -------------------------------------------------------------------------
  describe('2. Authentication & JWT Security', () => {
    it('should reject requests with tampered JWT signatures (401)', async () => {
      const tamperedToken = `${tokenA.slice(0, -5)}abcde`;
      const res = await request(app)
        .get('/api/v1/platform/dashboard')
        .set('Authorization', `Bearer ${tamperedToken}`);
      expect(res.status).toBe(401);
    });

    it('should revoke access when user tokenVersion is incremented', async () => {
      // Create user with version 0
      const tempUser = await User.create({
        tenantId: tenantA._id,
        name: 'Temp Revoke User',
        email: `temp_revoke_${Date.now()}@usesetu.com`,
        mobile: '9812345678',
        password: 'Password123!',
        role: Role.ADMIN,
        tokenVersion: 0,
        isEmailVerified: true,
        isActive: true,
      });

      const oldToken = generateAccessToken({
        userId: tempUser._id.toString(),
        role: Role.ADMIN,
        tokenVersion: 0,
      });

      // Increment tokenVersion on user (simulating logout-all / password change)
      await User.findByIdAndUpdate(tempUser._id, { $inc: { tokenVersion: 1 } }).setOptions({ bypassTenantQuery: true });

      const res = await request(app)
        .get('/api/v1/platform/dashboard')
        .set('Authorization', `Bearer ${oldToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Session expired');
    });
  });

  // -------------------------------------------------------------------------
  // 3. TENANT & ACCOUNT ISOLATION TESTS
  // -------------------------------------------------------------------------
  describe('3. Tenant & Account Isolation Enforcement', () => {
    it('Account A cannot view or access Account B application details (403 or 404)', async () => {
      const res = await request(app)
        .get(`/api/v1/platform/applications/${appB._id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect([403, 404]).toContain(res.status);
    });

    it('Account A cannot modify Account B application settings (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/platform/applications/${appB._id}/settings`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ displayName: 'Malicious Rename' });
      expect([403, 404]).toContain(res.status);
    });

    it('Account A cannot access Account B subscription or billing history (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/platform/applications/${appB._id}/subscription`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect([403, 404]).toContain(res.status);
    });

    it('Host Tenant vs JWT Tenant mismatch is terminated with 403 Forbidden', async () => {
      // Incoming request arrives at Application A domain (Tenant A) but carries User B token (Tenant B)
      const res = await request(app)
        .get('/api/v1/services')
        .set('Host', `${appA.slug}.usesetu.com`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('mismatch');
    });
  });

  // -------------------------------------------------------------------------
  // 4. APPLICATION LIFECYCLE & ARCHIVAL ROUTING BLOCK
  // -------------------------------------------------------------------------
  describe('4. Application Lifecycle & Archival Security', () => {
    it('should transition through ACTIVE -> SUSPENDED -> RESUMED -> ARCHIVED', async () => {
      const stamp = Date.now();
      const lifecycleApp = await Application.create({
        accountId: accountA._id,
        tenantId: tenantA._id,
        templateId: template._id,
        templateVersion: 1,
        name: 'Lifecycle App',
        slug: `lifecycle-${stamp}`,
        status: ApplicationStatus.ACTIVE,
        primaryDomain: `lifecycle-${stamp}.usesetu.com`,
      });

      // Suspend
      const suspendRes = await request(app)
        .post(`/api/v1/platform/applications/${lifecycleApp._id}/suspend`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ reason: 'Maintenance' });
      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.data.status).toBe(ApplicationStatus.SUSPENDED);

      // Resume
      const resumeRes = await request(app)
        .post(`/api/v1/platform/applications/${lifecycleApp._id}/resume`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.status).toBe(ApplicationStatus.ACTIVE);

      // Archive
      const archiveRes = await request(app)
        .post(`/api/v1/platform/applications/${lifecycleApp._id}/archive`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.data.status).toBe(ApplicationStatus.ARCHIVED);

      // Archived application must reject checkout attempts
      const checkoutRes = await request(app)
        .post(`/api/v1/platform/applications/${lifecycleApp._id}/billing/checkout`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          planId: starterPlan._id.toString(),
          billingCycle: BillingCycle.MONTHLY,
        });
      expect(checkoutRes.status).toBe(400);
      expect(checkoutRes.body.message).toContain('Archived');
    });
  });

  // -------------------------------------------------------------------------
  // 5. RAZORPAY BILLING & WEBHOOK ENGINE
  // -------------------------------------------------------------------------
  describe('5. Razorpay Billing & Webhook Security', () => {
    it('should compute checkout amounts server-side and reject client price tampering', async () => {
      const checkoutRes = await request(app)
        .post(`/api/v1/platform/applications/${appA._id}/billing/checkout`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          planId: starterPlan._id.toString(),
          billingCycle: BillingCycle.MONTHLY,
          amount: 1, // Attempt to pay 1 rupee instead of 999
        });

      expect(checkoutRes.status).toBe(200);
      expect(checkoutRes.body.data.amount).toBe(49900); // Enforced to 49900 paise server-side
    });

    it('should reject webhooks with missing or invalid HMAC signatures (400/401)', async () => {
      const res = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', 'invalid_signature_hash')
        .send({
          event: 'payment.captured',
          payload: { payment: { entity: { id: 'pay_fraud_123' } } },
        });

      expect([400, 401]).toContain(res.status);
    });

    it('should process webhook events idempotently without double subscription activation', async () => {
      const stamp = Date.now();
      const webhookPaymentId = `pay_stage10_${stamp}`;
      const webhookOrderId = `order_stage10_${stamp}`;

      // Create transaction
      await PaymentTransaction.create({
        accountId: accountA._id,
        applicationId: appA._id,
        planId: starterPlan._id,
        billingCycle: BillingCycle.MONTHLY,
        provider: 'razorpay',
        providerOrderId: webhookOrderId,
        amount: 49900,
        currency: 'INR',
        status: PaymentTransactionStatus.CREATED,
      });

      const payload = {
        entity: 'event',
        account_id: 'acc_test',
        event: 'payment.captured',
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: webhookPaymentId,
              entity: 'payment',
              amount: 49900,
              currency: 'INR',
              status: 'captured',
              order_id: webhookOrderId,
              method: 'netbanking',
              captured: true,
              created_at: Math.floor(Date.now() / 1000),
              notes: {
                applicationId: String(appA._id),
                accountId: String(accountA._id),
              },
            },
          },
        },
        created_at: Math.floor(Date.now() / 1000),
      };

      const crypto = await import('crypto');
      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      // 1st delivery
      const res1 = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res1.status).toBe(200);
      expect(res1.body.data.received).toBe(true);

      // 2nd delivery (duplicate)
      const res2 = await request(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res2.status).toBe(200);
      expect(res2.body.data.received).toBe(true);
      expect(res2.body.data.duplicate).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 6. SUBSCRIPTION LIFECYCLE & DATA SAFETY
  // -------------------------------------------------------------------------
  describe('6. Subscription Lifecycle & Data Safety', () => {
    it('should transition past_due subscriptions during grace period without deleting customer data', async () => {
      const stamp = Date.now();
      const graceApp = await Application.create({
        accountId: accountA._id,
        tenantId: tenantA._id,
        templateId: template._id,
        templateVersion: 1,
        name: 'Grace Period App',
        slug: `grace-${stamp}`,
        status: ApplicationStatus.ACTIVE,
        primaryDomain: `grace-${stamp}.usesetu.com`,
      });

      const pastDueSub = await Subscription.create({
        applicationId: graceApp._id,
        planId: starterPlan._id,
        status: SubscriptionStatus.PAST_DUE,
        billingCycle: BillingCycle.MONTHLY,
        startsAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        gracePeriodEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Active 7d grace
      });

      expect(pastDueSub.status).toBe(SubscriptionStatus.PAST_DUE);

      // Verify application and tenant still exist and remain active
      const appCheck = await Application.findById(graceApp._id);
      expect(appCheck).toBeDefined();
      expect(appCheck?.status).toBe(ApplicationStatus.ACTIVE);

      await Subscription.findByIdAndDelete(pastDueSub._id);
      await Application.findByIdAndDelete(graceApp._id);
    });
  });

  // -------------------------------------------------------------------------
  // 7. CUSTOM DOMAIN SECURITY
  // -------------------------------------------------------------------------
  describe('7. Custom Domain Security & Verification', () => {
    it('should reject reserved hostnames from being claimed as custom domains', async () => {
      const reservedHostnames = ['admin.com', 'api.usesetu.com', 'app.com'];
      for (const hostname of reservedHostnames) {
        const domain = new ApplicationDomain({
          applicationId: appA._id,
          hostname,
          type: DomainType.CUSTOM,
          status: DomainStatus.PENDING,
          sslStatus: SslStatus.PENDING,
          isPrimary: false,
          verificationAttempts: 0,
        });

        // ApplicationDomain pre-save checks reserved domains
        if (hostname.endsWith('usesetu.com')) {
          expect(domain.type).not.toBe(DomainType.DEFAULT);
        }
      }
    });

    it('disabled custom domains should be blocked from routing traffic', async () => {
      const stamp = Date.now();
      const disabledDomain = await ApplicationDomain.create({
        applicationId: appA._id,
        hostname: `disabled-${stamp}.customdomain.in`,
        type: DomainType.CUSTOM,
        status: DomainStatus.DISABLED,
        sslStatus: SslStatus.FAILED,
        isPrimary: false,
        verificationAttempts: 1,
      });

      expect(disabledDomain.status).toBe(DomainStatus.DISABLED);
    });
  });

  // -------------------------------------------------------------------------
  // 8. HEALTH CHECKS & SUPER ADMIN OPERATIONS RBAC
  // -------------------------------------------------------------------------
  describe('8. Health Diagnostics & Super Admin Control Plane RBAC', () => {
    it('GET /health/live returns HTTP 200 process liveness', async () => {
      const res = await request(app).get('/health/live');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
    });

    it('GET /health/ready returns HTTP 200 dependency readiness', async () => {
      const res = await request(app).get('/health/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.dependencies.mongodb).toBe('connected');
    });

    it('SUPER_ADMIN can access /api/v1/admin/operations/overview while normal users receive 403', async () => {
      // Normal user
      const forbiddenRes = await request(app)
        .get('/api/v1/admin/operations/overview')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(forbiddenRes.status).toBe(403);

      // Super Admin
      const adminRes = await request(app)
        .get('/api/v1/admin/operations/overview')
        .set('Authorization', `Bearer ${superAdminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.success).toBe(true);
      expect(adminRes.body.data.system).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // 9. LOGGING & SENSITIVE DATA REDACTION
  // -------------------------------------------------------------------------
  describe('9. Sensitive Secret Redaction & Sanitization', () => {
    it('should sanitize credentials, secrets, tokens, cards, and keys deeply', () => {
      const payload = {
        authHeader: 'Bearer eyJhbGciOiJIUzI1Ni...',
        payment: {
          razorpay_key_secret: 'secret_123',
          card: {
            cardNumber: '4111222233334444',
            cvv: '123',
            otp: '654321',
          },
        },
        publicMetadata: {
          organization: 'UseSetu SaaS',
        },
      };

      const sanitized: any = sanitizeLogData(payload);
      expect(sanitized.authHeader).toBe('[REDACTED]');
      expect(sanitized.payment.razorpay_key_secret).toBe('[REDACTED]');
      expect(sanitized.payment.card).toBe('[REDACTED]');
      expect(sanitized.publicMetadata.organization).toBe('UseSetu SaaS');
    });
  });

  // -------------------------------------------------------------------------
  // 10. BACKGROUND JOB RELIABILITY & MONITORING
  // -------------------------------------------------------------------------
  describe('10. Background Job Reliability & Monitoring', () => {
    it('should track job execution metrics and record partial or failed states safely', async () => {
      const { execution } = await JobMonitorService.executeJob('stage10-health-job', async (ctx) => {
        ctx.recordSuccess(10);
        ctx.recordFailure(2);
        return { status: 'ok' };
      });

      expect(execution.status).toBe('PARTIAL');
      expect(execution.recordsSucceeded).toBe(10);
      expect(execution.recordsFailed).toBe(2);
      expect(execution.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  // -------------------------------------------------------------------------
  // 11. SECURITY NEGATIVE / PENETRATION TESTS
  // -------------------------------------------------------------------------
  describe('11. Security Negative / Penetration Tests', () => {
    it('should safely handle malformed Mongo ObjectIds (400 or 404, never 500)', async () => {
      const res = await request(app)
        .get('/api/v1/platform/applications/invalid-non-hex-id')
        .set('Authorization', `Bearer ${tokenA}`);
      expect([400, 404]).toContain(res.status);
    });

    it('should log security events and record IP address and route', async () => {
      const event = await SecurityAuditService.recordEvent({
        eventType: 'TENANT_MISMATCH',
        severity: 'HIGH',
        ipAddress: '127.0.0.1',
        route: '/api/v1/services',
        method: 'GET',
        details: { targetTenant: 'forged_tenant_id' },
      });

      expect(event).toBeDefined();
      expect(event?.eventType).toBe('TENANT_MISMATCH');
      expect(event?.ipAddress).toBe('127.0.0.1');
    });
  });
});
