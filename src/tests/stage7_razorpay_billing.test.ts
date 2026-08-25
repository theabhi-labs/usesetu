import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import mongoose from 'mongoose';
import supertest from 'supertest';
import crypto from 'crypto';
import { env } from '../config/env';
import app from '../app';
import { ApplicationStatus } from '../models/application.model';
import { Account, AccountStatus } from '../models/account.model';
import { ApplicationTemplate, TemplateStatus } from '../models/applicationTemplate.model';
import { Plan } from '../models/plan.model';
import { BillingCycle } from '../models/subscription.model';
import { PaymentTransaction, PaymentTransactionStatus } from '../models/paymentTransaction.model';
import { PaymentWebhookEvent, WebhookEventStatus } from '../models/paymentWebhookEvent.model';
import { BillingInvoice, BillingInvoiceStatus } from '../models/billingInvoice.model';
import { SubscriptionAuditLog } from '../models/subscriptionAuditLog.model';
import { User } from '../models/user.model';
import { Role } from '../types/auth.types';
import { generateAccessToken } from '../services/token.service';
import { ApplicationProvisioningService } from '../services/applicationProvisioning.service';
import { RazorpayProvider } from '../services/payment/razorpay/razorpay.provider';
import { SubscriptionBillingPolicyService } from '../services/payment/subscriptionBillingPolicy.service';
import { PaymentReconciliationService } from '../services/payment/paymentReconciliation.service';
import { seedPlans } from '../seeders/planAndSubscription.seeder';

describe('UseSetu Stage 7 — Production-Safe Razorpay Payment & Billing Test Suite', () => {
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let accountA: any;
  let appA1: any;
  let appA2: any;
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
    } catch {}
    try {
      await mongoose.connection.collection('billinginvoices').drop();
    } catch {}
    try {
      await mongoose.connection.collection('paymentwebhookevents').drop();
    } catch {}
    try {
      await mongoose.connection.collection('paymentcustomers').drop();
    } catch {}

    await PaymentTransaction.syncIndexes();
    await BillingInvoice.syncIndexes();
    await PaymentWebhookEvent.syncIndexes();

    // Seed Template
    let template = await ApplicationTemplate.findOne({ slug: 'digital-service-center' });
    if (!template) {
      template = await ApplicationTemplate.create({
        name: 'Digital Service Center',
        slug: 'digital-service-center',
        category: 'csc',
        description: 'No-Code Citizen Service Center OS',
        version: 1,
        status: TemplateStatus.ACTIVE,
      });
    }

    const stamp = Date.now();

    // Account & User A
    userA = await User.create({
      name: 'Alice Owner',
      email: `alice_${stamp}@usesetu.com`,
      mobile: '9876543210',
      password: 'Password123!',
      role: Role.ADMIN,
      tenantId: new mongoose.Types.ObjectId(),
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });
    accountA = await Account.create({
      ownerUserId: userA._id,
      name: 'Alice Cloud Account',
      status: AccountStatus.ACTIVE,
    });
    tokenA = generateAccessToken({ userId: String(userA._id), role: Role.ADMIN, tokenVersion: 0 });

    // Account & User B
    userB = await User.create({
      name: 'Bob Owner',
      email: `bob_${stamp}@usesetu.com`,
      mobile: '9876543211',
      password: 'Password123!',
      role: Role.ADMIN,
      tenantId: new mongoose.Types.ObjectId(),
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });
    await Account.create({
      ownerUserId: userB._id,
      name: 'Bob Cloud Account',
      status: AccountStatus.ACTIVE,
    });
    tokenB = generateAccessToken({ userId: String(userB._id), role: Role.ADMIN, tokenVersion: 0 });

    // Provision Applications
    const provA1 = await ApplicationProvisioningService.provisionApplication({
      accountId: String(accountA._id),
      ownerId: String(userA._id),
      name: 'Alice Service Center',
      slug: `alice-billing-${stamp}`,
      templateSlug: 'digital-service-center',
    });
    appA1 = provA1.application;

    const provA2 = await ApplicationProvisioningService.provisionApplication({
      accountId: String(accountA._id),
      ownerId: String(userA._id),
      name: 'Alice Second Center',
      slug: `alice-two-${stamp}`,
      templateSlug: 'digital-service-center',
    });
    appA2 = provA2.application;
  }, 40000);

  afterAll(async () => {
    await mongoose.disconnect();
  });

  // 1. Payment Provider & Minor Unit Policy
  describe('1. Payment Provider Abstraction & Policy Engine', () => {
    it('should have a configured Razorpay provider with correct capability flags', () => {
      const provider = new RazorpayProvider();
      expect(provider.providerName).toBe('razorpay');
      expect(provider.capabilities.supportsRecurringBilling).toBe(true);
      expect(provider.capabilities.supportsRefunds).toBe(true);
      expect(provider.capabilities.supportsInvoices).toBe(true);
    });

    it('should accurately convert between major currency units (INR) and minor units (paise)', () => {
      expect(SubscriptionBillingPolicyService.toMinorUnits(499)).toBe(49900);
      expect(SubscriptionBillingPolicyService.toMinorUnits(999.5)).toBe(99950);
      expect(SubscriptionBillingPolicyService.toMajorUnits(49900)).toBe(499);
    });

    it('should evaluate Free to Paid plan transition as requiring payment', () => {
      const evalResult = SubscriptionBillingPolicyService.evaluateTransition(
        null,
        freePlan,
        starterPlan,
        BillingCycle.MONTHLY,
      );
      expect(evalResult.requiresPayment).toBe(true);
      expect(evalResult.amount).toBe(starterPlan.pricing.monthly * 100);
      expect(evalResult.isUpgrade).toBe(true);
    });
  });

  // 2. Checkout Creation & Server-Side Pricing
  describe('2. Checkout Order Creation & Security', () => {
    it('should reject unauthenticated checkout attempt with 401', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/billing/checkout`)
        .send({ planId: starterPlan._id, billingCycle: 'monthly' });

      expect(res.status).toBe(401);
    });

    it('should reject cross-account checkout attempt with 403 Forbidden', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/billing/checkout`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ planId: starterPlan._id, billingCycle: 'monthly' });

      expect(res.status).toBe(403);
    });

    it('should create checkout order with server-calculated price (ignoring any client amount)', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/billing/checkout`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          planId: starterPlan._id,
          billingCycle: 'monthly',
          amount: 1, // Tampered client amount should be ignored
        });

      expect(res.status).toBe(200);
      expect(res.body.data.orderId).toBeDefined();
      expect(res.body.data.amount).toBe(starterPlan.pricing.monthly * 100); // Canonical server price
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.razorpayKeyId).toBeDefined();

      // Verify local transaction created
      const tx = await PaymentTransaction.findById(res.body.data.transactionId);
      expect(tx).toBeDefined();
      expect(tx?.status).toBe(PaymentTransactionStatus.CREATED);
      expect(tx?.amount).toBe(starterPlan.pricing.monthly * 100);
    });

    it('should reject checkout for archived applications', async () => {
      appA2.status = ApplicationStatus.ARCHIVED;
      await appA2.save();

      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA2._id}/billing/checkout`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ planId: starterPlan._id, billingCycle: 'monthly' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Archived applications cannot be upgraded or billed');
    });
  });

  // 3. Payment Signature Verification & Subscription Activation
  describe('3. Payment Verification & Cryptographic Signature', () => {
    let orderId: string;
    let paymentId: string;
    let validSignature: string;

    beforeAll(async () => {
      const checkoutRes = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/billing/checkout`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ planId: proPlan._id, billingCycle: 'monthly' });

      orderId = checkoutRes.body.data.orderId;
      paymentId = `pay_${Date.now()}`;

      // Generate valid HMAC SHA256 signature
      validSignature = crypto
        .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    });

    it('should reject payment verification with invalid signature (400 Bad Request)', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/billing/verify-payment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: 'invalid_forged_signature_hash',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid payment signature');
    });

    it('should verify payment and authoritatively activate subscription upon valid signature', async () => {
      // Mock fetchPayment to return captured status with correct amount
      vi.spyOn(RazorpayProvider.prototype, 'fetchPayment').mockResolvedValueOnce({
        paymentId,
        orderId,
        amount: proPlan.pricing.monthly * 100,
        currency: 'INR',
        status: 'captured',
        method: 'upi',
        captured: true,
        createdAt: Math.floor(Date.now() / 1000),
      });

      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/billing/verify-payment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(res.body.data.transaction.status).toBe(PaymentTransactionStatus.CAPTURED);
      expect(res.body.data.subscription.planSnapshot.slug).toBe(proPlan.slug);

      // Verify BillingInvoice record created
      const invoice = await BillingInvoice.findOne({ applicationId: appA1._id, paymentTransactionId: res.body.data.transaction._id });
      expect(invoice).toBeDefined();
      expect(invoice?.status).toBe(BillingInvoiceStatus.PAID);
      expect(invoice?.total).toBe(proPlan.pricing.monthly * 100);

      // Verify Audit Log created
      const audit = await SubscriptionAuditLog.findOne({
        applicationId: appA1._id,
        action: 'SUBSCRIPTION_UPGRADED',
      }).sort({ createdAt: -1 });
      expect(audit).toBeDefined();
    });

    it('should be idempotent: subsequent verification returns existing state without duplicating invoices', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/billing/verify-payment`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSignature,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);

      const invoiceCount = await BillingInvoice.countDocuments({ applicationId: appA1._id });
      expect(invoiceCount).toBe(1);
    });
  });

  // 4. Webhook Engine, Signature & Event Lifecycle
  describe('4. Webhook Engine & Idempotent Ingestion', () => {
    it('should reject webhook requests with invalid or missing signature (401 Unauthorized)', async () => {
      const res = await supertest(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', 'invalid_signature')
        .send({ event: 'payment.captured' });

      expect(res.status).toBe(401);
    });

    it('should process payment.captured webhook event and update transaction', async () => {
      const webhookPaymentId = `pay_hook_${Date.now()}`;
      const webhookOrderId = `order_hook_${Date.now()}`;

      // Create a pending transaction
      const tx = await PaymentTransaction.create({
        accountId: accountA._id,
        applicationId: appA1._id,
        planId: starterPlan._id,
        billingCycle: BillingCycle.MONTHLY,
        provider: 'razorpay',
        providerOrderId: webhookOrderId,
        amount: starterPlan.pricing.monthly * 100,
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
              amount: starterPlan.pricing.monthly * 100,
              currency: 'INR',
              status: 'captured',
              order_id: webhookOrderId,
              method: 'netbanking',
              captured: true,
              created_at: Math.floor(Date.now() / 1000),
              notes: {
                applicationId: String(appA1._id),
                accountId: String(accountA._id),
              },
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

      const res = await supertest(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.data.received).toBe(true);

      // Verify transaction updated to captured
      const updatedTx = await PaymentTransaction.findById(tx._id);
      expect(updatedTx?.status).toBe(PaymentTransactionStatus.CAPTURED);
      expect(updatedTx?.providerPaymentId).toBe(webhookPaymentId);

      // Verify webhook event recorded
      const webhookRecord = await PaymentWebhookEvent.findOne({ eventType: 'payment.captured', provider: 'razorpay' });
      expect(webhookRecord).toBeDefined();
      expect(webhookRecord?.status).toBe(WebhookEventStatus.PROCESSED);
    });

    it('should handle duplicate webhook delivery idempotently without re-triggering actions', async () => {
      const eventId = `evt_dup_${Date.now()}`;
      const payload = {
        event_id: eventId,
        entity: 'event',
        event: 'order.paid',
        contains: ['order'],
        payload: {
          order: {
            entity: {
              id: `order_dup_${Date.now()}`,
              amount: 10000,
              currency: 'INR',
              status: 'paid',
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

      // 1st delivery
      const res1 = await supertest(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res1.status).toBe(200);

      // 2nd delivery (duplicate)
      const res2 = await supertest(app)
        .post('/api/v1/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      expect(res2.status).toBe(200);
      expect(res2.body.data.duplicate).toBe(true);
    });
  });

  // 5. Refund Flow & Authorization
  describe('5. Refund Management & Data Safety', () => {
    let capturedTx: any;

    beforeAll(async () => {
      capturedTx = await PaymentTransaction.create({
        accountId: accountA._id,
        applicationId: appA1._id,
        planId: proPlan._id,
        billingCycle: BillingCycle.MONTHLY,
        provider: 'razorpay',
        providerPaymentId: `pay_refund_test_${Date.now()}`,
        amount: proPlan.pricing.monthly * 100,
        currency: 'INR',
        status: PaymentTransactionStatus.CAPTURED,
      });
    });

    it('should forbid Account B from requesting refund on Account A transaction', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/billing/payments/${capturedTx.providerPaymentId}/refund`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ reason: 'Unauthorized refund' });

      expect(res.status).toBe(403);
    });

    it('should allow Account A to initiate a partial refund', async () => {
      vi.spyOn(RazorpayProvider.prototype, 'refundPayment').mockResolvedValueOnce({
        refundId: `rfnd_${Date.now()}`,
        paymentId: capturedTx.providerPaymentId,
        amount: 20000,
        currency: 'INR',
        status: 'processed',
      });

      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/billing/payments/${capturedTx.providerPaymentId}/refund`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          amount: 20000, // Partial refund of ₹200
          reason: 'Customer requested adjustment',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(PaymentTransactionStatus.PARTIALLY_REFUNDED);
      expect(res.body.data.refundAmount).toBe(20000);
    });
  });

  // 6. Billing History & Payment Details
  describe('6. Billing History & Transaction Details', () => {
    it('should return paginated billing history for Account A application', async () => {
      const res = await supertest(app)
        .get(`/api/v1/platform/applications/${appA1._id}/billing/history?page=1&limit=10`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.transactions).toBeInstanceOf(Array);
      expect(res.body.data.pagination.total).toBeGreaterThan(0);
      expect(res.body.data.transactions[0].amountMajor).toBeDefined();
    });

    it('should return application billing summary with entitlements and recent transactions', async () => {
      const res = await supertest(app)
        .get(`/api/v1/platform/applications/${appA1._id}/billing`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.applicationId).toBe(String(appA1._id));
      expect(res.body.data.currentSubscription).toBeDefined();
      expect(res.body.data.effectiveEntitlements).toBeDefined();
      expect(res.body.data.availablePlans).toBeInstanceOf(Array);
    });
  });

  // 7. Reconciliation Engine
  describe('7. Payment Reconciliation Service', () => {
    it('should detect when local pending transaction is captured in provider and sync state', async () => {
      const uncapturedTx = await PaymentTransaction.create({
        accountId: accountA._id,
        applicationId: appA1._id,
        planId: starterPlan._id,
        billingCycle: BillingCycle.MONTHLY,
        provider: 'razorpay',
        providerPaymentId: `pay_sync_${Date.now()}`,
        amount: starterPlan.pricing.monthly * 100,
        currency: 'INR',
        status: PaymentTransactionStatus.CREATED,
      });

      vi.spyOn(RazorpayProvider.prototype, 'fetchPayment').mockResolvedValueOnce({
        paymentId: uncapturedTx.providerPaymentId!,
        amount: starterPlan.pricing.monthly * 100,
        currency: 'INR',
        status: 'captured',
        method: 'card',
        captured: true,
        createdAt: Math.floor(Date.now() / 1000),
      });

      const report = await PaymentReconciliationService.reconcilePayment(uncapturedTx.providerPaymentId!);
      expect(report.synced).toBe(true);
      expect(report.newStatus).toBe(PaymentTransactionStatus.CAPTURED);

      const refreshed = await PaymentTransaction.findById(uncapturedTx._id);
      expect(refreshed?.status).toBe(PaymentTransactionStatus.CAPTURED);
    });
  });
});
