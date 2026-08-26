import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { env } from '../config/env';
import app from '../app';
import { Account, AccountStatus } from '../models/account.model';
import { Plan } from '../models/plan.model';
import { Subscription, SubscriptionStatus, BillingCycle } from '../models/subscription.model';
import { PaymentTransaction, PaymentTransactionStatus } from '../models/paymentTransaction.model';
import { PaymentWebhookEvent } from '../models/paymentWebhookEvent.model';
import { SubscriptionAuditLog } from '../models/subscriptionAuditLog.model';
import { PlatformNotification, PlatformNotificationCategory } from '../models/platformNotification.model';
import { User } from '../models/user.model';
import { Role } from '../types/auth.types';
import { generateAccessToken } from '../services/token.service';
import { ApplicationProvisioningService } from '../services/applicationProvisioning.service';
import { RazorpayProvider } from '../services/payment/razorpay/razorpay.provider';
import { SubscriptionService } from '../services/subscription.service';
import { BillingLifecycleService } from '../services/billingLifecycle.service';
import { PaymentReconciliationService } from '../services/payment/paymentReconciliation.service';
import { PaymentService } from '../services/payment/payment.service';
import { seedPlans } from '../seeders/planAndSubscription.seeder';

describe('UseSetu Stage 8 — Production-Grade, Self-Healing, Auditable & Automated Billing Lifecycle', () => {
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let accountA: any;
  let appA: any;
  let freePlan: any;
  let starterPlan: any;
  let proPlan: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }

    await seedPlans();
    freePlan = await Plan.findOne({ slug: 'free' });
    starterPlan = await Plan.findOne({ slug: 'starter' });
    proPlan = await Plan.findOne({ slug: 'professional' });

    try {
      await mongoose.connection.collection('paymenttransactions').drop();
    } catch {
      // Collection may not exist yet
    }
    try {
      await mongoose.connection.collection('billinginvoices').drop();
    } catch {
      // Collection may not exist yet
    }
    try {
      await mongoose.connection.collection('paymentwebhookevents').drop();
    } catch {
      // Collection may not exist yet
    }
    try {
      await mongoose.connection.collection('subscriptionauditlogs').drop();
    } catch {
      // Collection may not exist yet
    }
    try {
      await mongoose.connection.collection('platformnotifications').drop();
    } catch {
      // Collection may not exist yet
    }
    try {
      await mongoose.connection.collection('subscriptions').drop();
    } catch {
      // Collection may not exist yet
    }

    await PaymentTransaction.syncIndexes();
    await PaymentWebhookEvent.syncIndexes();
    await Subscription.syncIndexes();

    const stamp = Date.now();

    // User A
    userA = await User.create({
      name: 'Stage 8 Account Owner A',
      email: `stage8_owner_a_${stamp}@usesetu.com`,
      mobile: '9876543220',
      password: 'Password123!',
      role: Role.ADMIN,
      isActive: true,
      isEmailVerified: true,
      isMobileVerified: true,
      tenantId: new mongoose.Types.ObjectId(),
    });
    tokenA = generateAccessToken({
      userId: String(userA._id),
      role: Role.ADMIN,
      tokenVersion: 0,
    });

    accountA = await Account.create({
      name: 'Stage 8 Account Corp A',
      slug: `stage8-corp-a-${stamp}`,
      ownerUserId: userA._id,
      status: AccountStatus.ACTIVE,
    });

    // User B (for isolation checks)
    userB = await User.create({
      name: 'Stage 8 Account Owner B',
      email: `stage8_owner_b_${stamp}@usesetu.com`,
      mobile: '9876543221',
      password: 'Password123!',
      role: Role.ADMIN,
      isActive: true,
      isEmailVerified: true,
      isMobileVerified: true,
      tenantId: new mongoose.Types.ObjectId(),
    });
    tokenB = generateAccessToken({
      userId: String(userB._id),
      role: Role.ADMIN,
      tokenVersion: 0,
    });

    await Account.create({
      name: 'Stage 8 Account Corp B',
      slug: `stage8-corp-b-${stamp}`,
      ownerUserId: userB._id,
      status: AccountStatus.ACTIVE,
    });

    // Provision Application for Account A
    const resA = await ApplicationProvisioningService.provisionApplication({
      accountId: String(accountA._id),
      ownerId: String(userA._id),
      name: 'Panchayat Kendra Stage 8',
      slug: `pk-stage8-${stamp}`,
      templateSlug: 'digital-service-center',
    });
    appA = resA.application;

    // Activate starter plan initially
    await SubscriptionService.activateFromPayment({
      applicationId: appA._id,
      planId: starterPlan._id,
      billingCycle: BillingCycle.MONTHLY,
      provider: 'razorpay',
      providerPaymentId: `pay_init_${stamp}`,
      providerOrderId: `order_init_${stamp}`,
      actorId: String(userA._id),
    });
  }, 40000);

  afterAll(async () => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Grace Period & Dunning Transition
  // =========================================================================
  describe('1. Grace Period Management & Preservation of Service', () => {
    it('should transition subscription to PAST_DUE and initiate a 7-day grace period on payment failure', async () => {
      const subBefore = await Subscription.findOne({ applicationId: appA._id, status: SubscriptionStatus.ACTIVE });
      expect(subBefore).toBeDefined();

      const updatedSub = await SubscriptionService.markPaymentFailed({
        applicationId: appA._id,
        failureReason: 'Card expired or insufficient balance',
        providerPaymentId: 'pay_failed_101',
        gracePeriodDays: 7,
      });

      expect(updatedSub).toBeDefined();
      expect(updatedSub?.status).toBe(SubscriptionStatus.PAST_DUE);
      expect(updatedSub?.gracePeriodEndsAt).toBeDefined();
      expect(updatedSub?.recoveryAttempts).toBe(1);

      // Verify Audit Log
      const audit = await SubscriptionAuditLog.findOne({
        applicationId: appA._id,
        action: 'PAYMENT_FAILED',
      });
      expect(audit).toBeDefined();
      expect(audit?.newStatus).toBe(SubscriptionStatus.PAST_DUE);
      expect(audit?.metadata?.gracePeriodEndsAt).toBeDefined();

      // Verify Platform Notification
      const notification = await PlatformNotification.findOne({
        applicationId: appA._id,
        category: PlatformNotificationCategory.SUBSCRIPTION,
        title: { $regex: /Grace Period Active/i },
      });
      expect(notification).toBeDefined();
    });

    it('should preserve effective entitlements during active grace period without immediate service shutdown', async () => {
      const entitlements = await SubscriptionService.resolveEffectiveEntitlements(appA._id);
      expect(entitlements).toBeDefined();
      // Entitlements should still reflect starter plan during grace period
      expect(entitlements.customDomain?.enabled).toBe(starterPlan.entitlements.customDomain?.enabled);
      expect(entitlements.activeUsers?.limit).toBe(starterPlan.entitlements.activeUsers?.limit);
    });
  });

  // =========================================================================
  // 2. Dunning Recovery Workflow
  // =========================================================================
  describe('2. Dunning Payment Recovery Workflow', () => {
    it('should recover subscription to ACTIVE and clear grace period upon successful payment', async () => {
      const subPastDue = await Subscription.findOne({ applicationId: appA._id, status: SubscriptionStatus.PAST_DUE });
      expect(subPastDue).toBeDefined();

      const recoveredSub = await SubscriptionService.activateFromPayment({
        applicationId: appA._id,
        planId: proPlan._id,
        billingCycle: BillingCycle.MONTHLY,
        provider: 'razorpay',
        providerPaymentId: 'pay_recovery_202',
        providerOrderId: 'order_recovery_202',
        actorId: userA._id.toString(),
      });

      expect(recoveredSub.status).toBe(SubscriptionStatus.ACTIVE);
      expect(recoveredSub.gracePeriodEndsAt).toBeUndefined();
      expect(recoveredSub.recoveryAttempts).toBe(0);

      // Verify Recovery Audit Log
      const audit = await SubscriptionAuditLog.findOne({
        applicationId: appA._id,
        action: 'SUBSCRIPTION_RECOVERED',
      });
      expect(audit).toBeDefined();
      expect(audit?.metadata?.recoveredFromPastDue).toBe(true);

      // Verify Recovery Notification
      const notification = await PlatformNotification.findOne({
        applicationId: appA._id,
        title: { $regex: /Subscription Recovered/i },
      });
      expect(notification).toBeDefined();
    });
  });

  // =========================================================================
  // 3. Grace Period Expiration & Zero Data Loss
  // =========================================================================
  describe('3. Grace Period Expiration & Safe Free Tier Fallback', () => {
    it('should transition PAST_DUE subscription to EXPIRED when grace period has elapsed', async () => {
      // Artificially set subscription to past_due with gracePeriodEndsAt in the past
      const sub = await Subscription.findOne({ applicationId: appA._id, status: SubscriptionStatus.ACTIVE });
      expect(sub).toBeDefined();
      sub!.status = SubscriptionStatus.PAST_DUE;
      sub!.gracePeriodEndsAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      await sub!.save();

      const result = await BillingLifecycleService.processGracePeriodsAndExpirations();
      expect(result.subscriptionsExpired).toBeGreaterThanOrEqual(1);

      const expiredSub = await Subscription.findOne({ applicationId: appA._id, status: SubscriptionStatus.EXPIRED });
      expect(expiredSub).toBeDefined();

      // Effective entitlements should fall back to Free plan
      const entitlements = await SubscriptionService.resolveEffectiveEntitlements(appA._id);
      expect(entitlements.activeUsers?.limit).toBe(freePlan.entitlements.activeUsers?.limit);

      // Verify Audit Log
      const audit = await SubscriptionAuditLog.findOne({
        applicationId: appA._id,
        action: 'SUBSCRIPTION_EXPIRED',
      });
      expect(audit).toBeDefined();
    });
  });

  // =========================================================================
  // 4. Out-of-Order Webhook Delivery Resilience
  // =========================================================================
  describe('4. Webhook Out-of-Order Delivery & Delay Resilience', () => {
    it('should NOT overwrite a CAPTURED transaction with a delayed payment.failed webhook', async () => {
      const orderId = `order_delayed_${Date.now()}`;
      const paymentId = `pay_delayed_${Date.now()}`;

      // 1. First, create and capture a transaction
      const transaction = await PaymentTransaction.create({
        accountId: accountA._id,
        applicationId: appA._id,
        planId: starterPlan._id,
        billingCycle: BillingCycle.MONTHLY,
        provider: 'razorpay',
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        amount: 49900,
        currency: 'INR',
        status: PaymentTransactionStatus.CAPTURED,
        paidAt: new Date(),
      });

      // 2. Delayed payment.failed webhook arrives
      await PaymentService.handleNormalizedPaymentEvent({
        provider: 'razorpay',
        eventId: `evt_delayed_fail_${Date.now()}`,
        eventType: 'payment.failed',
        orderId,
        paymentId,
        failureReason: 'Late network failure event',
        amount: 49900,
        currency: 'INR',
        status: 'failed',
        occurredAt: new Date(Date.now() - 5000),
      });

      // 3. Transaction must remain CAPTURED
      const reloadedTx = await PaymentTransaction.findById(transaction._id);
      expect(reloadedTx?.status).toBe(PaymentTransactionStatus.CAPTURED);
    });

    it('should recover a FAILED transaction when a late payment.captured webhook arrives', async () => {
      const orderId = `order_recovered_${Date.now()}`;
      const paymentId = `pay_recovered_${Date.now()}`;

      // 1. Transaction was initially marked FAILED
      const transaction = await PaymentTransaction.create({
        accountId: accountA._id,
        applicationId: appA._id,
        planId: proPlan._id,
        billingCycle: BillingCycle.MONTHLY,
        provider: 'razorpay',
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        amount: 149900,
        currency: 'INR',
        status: PaymentTransactionStatus.FAILED,
        failedAt: new Date(),
        failureReason: 'Temporary network timeout',
      });

      // 2. Provider captured the payment and sends payment.captured webhook
      await PaymentService.handleNormalizedPaymentEvent({
        provider: 'razorpay',
        eventId: `evt_late_capture_${Date.now()}`,
        eventType: 'payment.captured',
        orderId,
        paymentId,
        method: 'upi',
        amount: 149900,
        currency: 'INR',
        status: 'captured',
        occurredAt: new Date(),
      });

      // 3. Transaction must transition to CAPTURED
      const reloadedTx = await PaymentTransaction.findById(transaction._id);
      expect(reloadedTx?.status).toBe(PaymentTransactionStatus.CAPTURED);
      expect(reloadedTx?.method).toBe('upi');
    });
  });

  // =========================================================================
  // 5. Automated Reminders & Billing Worker
  // =========================================================================
  describe('5. Automated Reminders & Billing Lifecycle Job', () => {
    it('should generate renewal reminders for upcoming expiring subscriptions', async () => {
      // Set subscription endsAt to 3 days in the future
      const sub = await Subscription.findOne({ applicationId: appA._id });
      expect(sub).toBeDefined();
      sub!.status = SubscriptionStatus.ACTIVE;
      sub!.endsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 1000); // ~3 days
      await sub!.save();

      const remindersSent = await BillingLifecycleService.processRenewalReminders();
      expect(remindersSent).toBeGreaterThanOrEqual(1);

      const notification = await PlatformNotification.findOne({
        applicationId: appA._id,
        title: { $regex: /Renewal Reminder/i },
      });
      expect(notification).toBeDefined();

      // Deduplication: running again immediately shouldn't create duplicate notifications
      const remindersSentAgain = await BillingLifecycleService.processRenewalReminders();
      expect(remindersSentAgain).toBe(0);
    });

    it('should run complete automated lifecycle cycle and return a structured report', async () => {
      const report = await BillingLifecycleService.runAutomatedLifecycleCycle();
      expect(report).toBeDefined();
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(typeof report.remindersSent).toBe('number');
      expect(typeof report.gracePeriodsStarted).toBe('number');
      expect(typeof report.subscriptionsExpired).toBe('number');
      expect(typeof report.dunningSent).toBe('number');
    });
  });

  // =========================================================================
  // 6. Reconciliation Engine & Self-Healing
  // =========================================================================
  describe('6. Self-Healing Reconciliation Engine', () => {
    it('should reconcile and repair a pending transaction against provider state', async () => {
      const orderId = `order_recon_${Date.now()}`;
      const paymentId = `pay_recon_${Date.now()}`;

      // Mock RazorpayProvider fetchPayment response
      vi.spyOn(RazorpayProvider.prototype, 'fetchPayment').mockResolvedValueOnce({
        paymentId,
        orderId,
        amount: 49900,
        currency: 'INR',
        status: 'captured',
        method: 'netbanking',
        captured: true,
        email: 'customer@usesetu.com',
        contact: '9999999999',
        createdAt: Math.floor(Date.now() / 1000),
      } as any);

      // Create a pending CREATED transaction
      const tx = await PaymentTransaction.create({
        accountId: accountA._id,
        applicationId: appA._id,
        planId: starterPlan._id,
        billingCycle: BillingCycle.MONTHLY,
        provider: 'razorpay',
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        amount: 49900,
        currency: 'INR',
        status: PaymentTransactionStatus.CREATED,
      });

      const report = await PaymentReconciliationService.reconcilePayment(paymentId);
      expect(report.synced).toBe(true);
      expect(report.newStatus).toBe(PaymentTransactionStatus.CAPTURED);

      const reloadedTx = await PaymentTransaction.findById(tx._id);
      expect(reloadedTx?.status).toBe(PaymentTransactionStatus.CAPTURED);
    });

    it('POST /api/v1/platform/applications/:id/billing/reconcile should trigger on-demand reconciliation', async () => {
      const response = await supertest(app)
        .post(`/api/v1/platform/applications/${appA._id}/billing/reconcile`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.reconciliationReports).toBeDefined();
    });
  });

  // =========================================================================
  // 7. Billing Audit Trail API & Multi-Tenant Isolation
  // =========================================================================
  describe('7. Billing Audit Trail API & Isolation', () => {
    it('GET /api/v1/platform/applications/:id/billing/audits should return paginated audit logs', async () => {
      const response = await supertest(app)
        .get(`/api/v1/platform/applications/${appA._id}/billing/audits?page=1&limit=10`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.audits).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.audits.length).toBeGreaterThan(0);
    });

    it('should deny User B access to User A application billing audits (Cross-Tenant Security)', async () => {
      const response = await supertest(app)
        .get(`/api/v1/platform/applications/${appA._id}/billing/audits`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should not contain any sensitive credentials or secrets in billing audit logs', async () => {
      const audits = await SubscriptionAuditLog.find({ applicationId: appA._id }).lean();
      expect(audits.length).toBeGreaterThan(0);

      for (const audit of audits) {
        const auditStr = JSON.stringify(audit).toLowerCase();
        expect(auditStr).not.toContain(env.RAZORPAY_KEY_SECRET.toLowerCase());
        expect(auditStr).not.toContain(env.RAZORPAY_WEBHOOK_SECRET.toLowerCase());
        expect(auditStr).not.toContain(env.JWT_ACCESS_SECRET.toLowerCase());
      }
    });
  });

  // =========================================================================
  // 8. Concurrency & Idempotency Hardening
  // =========================================================================
  describe('8. Concurrency & Idempotency Hardening', () => {
    it('should safely process concurrent duplicate webhook deliveries without race conditions', async () => {
      const { RazorpayWebhookHandler } = await import('../services/payment/razorpay/razorpay.webhook');
      const crypto = await import('crypto');

      const concurrentEventId = `evt_concurrent_${Date.now()}`;
      const payload = {
        entity: 'event',
        account_id: 'acc_stage8_concurrent',
        event: 'payment.captured',
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: `pay_conc_${Date.now()}`,
              order_id: `order_conc_${Date.now()}`,
              amount: 49900,
              currency: 'INR',
              status: 'captured',
              method: 'card',
              notes: {
                applicationId: String(appA._id),
                planId: String(starterPlan._id),
                billingCycle: 'monthly',
              },
              created_at: Math.floor(Date.now() / 1000),
            },
          },
        },
        created_at: Math.floor(Date.now() / 1000),
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      // Dispatch 5 concurrent webhook calls
      const promises = Array.from({ length: 5 }, () =>
        RazorpayWebhookHandler.handleWebhook({
          rawBody,
          signature,
          headers: { 'x-razorpay-event-id': concurrentEventId },
        }),
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(5);
      // All 5 must succeed
      for (const res of results) {
        expect(res.success).toBe(true);
        expect(res.eventId).toBe(concurrentEventId);
      }

      // Exactly 1 webhook event record created
      const eventRecords = await PaymentWebhookEvent.find({ eventId: concurrentEventId });
      expect(eventRecords.length).toBe(1);
    });
  });
});
