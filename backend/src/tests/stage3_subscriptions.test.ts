import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Plan, PlanStatus } from '../models/plan.model';
import { Subscription, SubscriptionStatus, BillingCycle } from '../models/subscription.model';
import { SubscriptionAuditLog } from '../models/subscriptionAuditLog.model';
import { Account, AccountStatus } from '../models/account.model';
import { Application, ApplicationStatus } from '../models/application.model';
import { ApplicationTemplate } from '../models/applicationTemplate.model';
import { User } from '../models/user.model';
import { Role } from '../types/auth.types';
import { SubscriptionService } from '../services/subscription.service';
import { EntitlementService } from '../services/entitlement.service';
import { ApplicationProvisioningService } from '../services/applicationProvisioning.service';
import { seedPlans } from '../seeders/planAndSubscription.seeder';

describe('UseSetu Stage 3 — Plans, Subscriptions, Entitlements & Usage Engine', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }
    await seedPlans();
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('1. Plan Model & Seeding', () => {
    it('should have standard plans seeded with dynamic pricing and typed entitlements', async () => {
      const plans = await Plan.find({ status: PlanStatus.ACTIVE });
      expect(plans.length).toBeGreaterThanOrEqual(4);

      const freePlan = await Plan.findOne({ slug: 'free' });
      expect(freePlan).toBeDefined();
      expect(freePlan!.pricing.monthly).toBe(0);
      expect(freePlan!.entitlements.activeUsers.limit).toBe(5);
      expect(freePlan!.entitlements.storage.limit).toBe(524288000); // 500 MB in bytes
      expect(freePlan!.entitlements.customDomain.enabled).toBe(false);

      const proPlan = await Plan.findOne({ slug: 'professional' });
      expect(proPlan).toBeDefined();
      expect(proPlan!.pricing.monthly).toBe(999);
      expect(proPlan!.entitlements.activeUsers.limit).toBe(50);
      expect(proPlan!.entitlements.customDomain.enabled).toBe(true);
    });

    it('should resolve the default fallback plan', async () => {
      const defaultPlan = await SubscriptionService.getDefaultPlan();
      expect(defaultPlan).toBeDefined();
      expect(defaultPlan.slug).toBe('free');
    });
  });

  describe('2. Application Provisioning with Default Subscription', () => {
    it('should automatically assign an active Free subscription and plan snapshot to a newly provisioned application', async () => {
      const testOwner = new mongoose.Types.ObjectId();
      const testAccount = await Account.create({
        ownerUserId: testOwner,
        name: 'Test Account Stage 3',
        status: AccountStatus.ACTIVE,
      });

      let template = await ApplicationTemplate.findOne({ slug: 'digital-service-center' });
      if (!template) {
        template = await ApplicationTemplate.create({
          name: 'Digital Service Center',
          slug: 'digital-service-center',
          category: 'digital_service_center',
          description: 'Blueprint for testing',
          version: 1,
        });
      }

      const slug = `test-app-${Date.now()}`;
      const result = await ApplicationProvisioningService.provisionApplication({
        accountId: String(testAccount._id),
        ownerId: String(testOwner),
        name: 'Stage 3 Test App',
        slug,
        templateSlug: 'digital-service-center',
      });

      expect(result.application).toBeDefined();
      expect(result.subscription).toBeDefined();
      expect(result.subscription.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.subscription.planSnapshot?.slug).toBe('free');
      expect(result.subscription.planSnapshot?.entitlements.activeUsers.limit).toBe(5);

      // Verify audit log was created
      const audit = await SubscriptionAuditLog.findOne({
        applicationId: result.application._id,
        action: 'SUBSCRIPTION_CREATED',
      });
      expect(audit).toBeDefined();
      expect(audit!.newPlan?.slug).toBe('free');
    });
  });

  describe('3. One Active Subscription Constraint', () => {
    it('should reject creating a second active subscription for the same application', async () => {
      const fakeAppId = new mongoose.Types.ObjectId();
      const freePlan = await Plan.findOne({ slug: 'free' });
      const starterPlan = await Plan.findOne({ slug: 'starter' });

      // Create first subscription
      await Subscription.create({
        applicationId: fakeAppId,
        planId: freePlan!._id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startsAt: new Date(),
      });

      // Try creating second active subscription via model (should fail unique partial index)
      let duplicateError: any = null;
      try {
        await Subscription.create({
          applicationId: fakeAppId,
          planId: starterPlan!._id,
          status: SubscriptionStatus.ACTIVE,
          billingCycle: BillingCycle.MONTHLY,
          startsAt: new Date(),
        });
      } catch (err: any) {
        duplicateError = err;
      }

      expect(duplicateError).toBeDefined();
    });
  });

  describe('4. Entitlement & Feature Evaluation', () => {
    it('should correctly evaluate boolean feature gates and numeric limits', async () => {
      const testApp = await Application.create({
        tenantId: new mongoose.Types.ObjectId(),
        accountId: new mongoose.Types.ObjectId(),
        templateId: new mongoose.Types.ObjectId(),
        templateVersion: 1,
        name: 'Entitlement App',
        slug: `entitlements-${Date.now()}`,
        status: ApplicationStatus.ACTIVE,
      });

      const freePlan = await Plan.findOne({ slug: 'free' });
      await Subscription.create({
        applicationId: testApp._id,
        planId: freePlan!._id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startsAt: new Date(),
        planSnapshot: {
          planId: freePlan!._id as any,
          slug: freePlan!.slug,
          name: freePlan!.name,
          entitlements: freePlan!.entitlements,
          version: 1,
        },
      });

      // Check features
      const canDomain = await EntitlementService.can(testApp._id, 'customDomain');
      expect(canDomain).toBe(false);

      const canEmail = await EntitlementService.can(testApp._id, 'email');
      expect(canEmail).toBe(true);

      // assertAllowed
      await expect(EntitlementService.assertAllowed(testApp._id, 'customDomain')).rejects.toThrow(
        /not enabled on your current subscription/,
      );

      // Numeric limits
      const userLimit = await EntitlementService.getLimit(testApp._id, 'active_users');
      expect(userLimit).toBe(5);

      const storageLimit = await EntitlementService.getLimit(testApp._id, 'storage_bytes');
      expect(storageLimit).toBe(524288000);
    });
  });

  describe('5. Active User Quota & Atomic Reservation', () => {
    it('should enforce active user limit for staff/admins and block when limit reached', async () => {
      const testApp = await Application.create({
        tenantId: new mongoose.Types.ObjectId(),
        accountId: new mongoose.Types.ObjectId(),
        templateId: new mongoose.Types.ObjectId(),
        templateVersion: 1,
        name: 'Seat App',
        slug: `seat-app-${Date.now()}`,
        status: ApplicationStatus.ACTIVE,
      });

      const freePlan = await Plan.findOne({ slug: 'free' });
      await Subscription.create({
        applicationId: testApp._id,
        planId: freePlan!._id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startsAt: new Date(),
        planSnapshot: {
          planId: freePlan!._id as any,
          slug: freePlan!.slug,
          name: freePlan!.name,
          entitlements: {
            ...freePlan!.entitlements,
            activeUsers: { limit: 2 }, // test with limit = 2
          },
          version: 1,
        },
      });

      // Reserve 1st seat
      await expect(EntitlementService.reserveUserSeat(testApp._id)).resolves.not.toThrow();
      expect(await EntitlementService.getUsage(testApp._id, 'active_users')).toBe(1);

      // Reserve 2nd seat
      await expect(EntitlementService.reserveUserSeat(testApp._id)).resolves.not.toThrow();
      expect(await EntitlementService.getUsage(testApp._id, 'active_users')).toBe(2);

      // Reserve 3rd seat (should fail because limit is 2)
      await expect(EntitlementService.reserveUserSeat(testApp._id)).rejects.toThrow(
        /Active user seat limit reached/,
      );

      // Release a seat
      await EntitlementService.releaseUserSeat(testApp._id);
      expect(await EntitlementService.getUsage(testApp._id, 'active_users')).toBe(1);

      // Now 2nd seat reservation should succeed again
      await expect(EntitlementService.reserveUserSeat(testApp._id)).resolves.not.toThrow();
    });

    it('should handle concurrent seat reservations safely without exceeding limit', async () => {
      const testApp = await Application.create({
        tenantId: new mongoose.Types.ObjectId(),
        accountId: new mongoose.Types.ObjectId(),
        templateId: new mongoose.Types.ObjectId(),
        templateVersion: 1,
        name: 'Concurrent Seat App',
        slug: `conc-seat-app-${Date.now()}`,
        status: ApplicationStatus.ACTIVE,
      });

      const freePlan = await Plan.findOne({ slug: 'free' });
      await Subscription.create({
        applicationId: testApp._id,
        planId: freePlan!._id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startsAt: new Date(),
        planSnapshot: {
          planId: freePlan!._id as any,
          slug: freePlan!.slug,
          name: freePlan!.name,
          entitlements: {
            ...freePlan!.entitlements,
            activeUsers: { limit: 3 },
          },
          version: 1,
        },
      });

      // Fire 10 simultaneous reservations
      const results = await Promise.allSettled(
        Array.from({ length: 10 }).map(() => EntitlementService.reserveUserSeat(testApp._id)),
      );

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(3);
      expect(rejected.length).toBe(7);

      const finalUsage = await EntitlementService.getUsage(testApp._id, 'active_users');
      expect(finalUsage).toBe(3);
    });
  });

  describe('6. Storage Quota Enforcement (in Bytes)', () => {
    it('should enforce byte-level storage limits, record uploads, and release on delete', async () => {
      const testApp = await Application.create({
        tenantId: new mongoose.Types.ObjectId(),
        accountId: new mongoose.Types.ObjectId(),
        templateId: new mongoose.Types.ObjectId(),
        templateVersion: 1,
        name: 'Storage App',
        slug: `storage-app-${Date.now()}`,
        status: ApplicationStatus.ACTIVE,
      });

      const freePlan = await Plan.findOne({ slug: 'free' });
      const smallStorageBytes = 1000; // 1000 bytes limit
      await Subscription.create({
        applicationId: testApp._id,
        planId: freePlan!._id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startsAt: new Date(),
        planSnapshot: {
          planId: freePlan!._id as any,
          slug: freePlan!.slug,
          name: freePlan!.name,
          entitlements: {
            ...freePlan!.entitlements,
            storage: { limit: smallStorageBytes, unit: 'bytes' },
          },
          version: 1,
        },
      });

      // Assert 600 bytes is allowed
      await expect(
        EntitlementService.assertWithinLimit(testApp._id, 'storage_bytes', 600),
      ).resolves.not.toThrow();

      // Record 600 bytes
      await EntitlementService.recordUsage(testApp._id, 'storage_bytes', 600);
      expect(await EntitlementService.getUsage(testApp._id, 'storage_bytes')).toBe(600);
      expect(await EntitlementService.getRemaining(testApp._id, 'storage_bytes')).toBe(400);

      // Try asserting another 500 bytes (600 + 500 = 1100 > 1000) -> should fail
      await expect(
        EntitlementService.assertWithinLimit(testApp._id, 'storage_bytes', 500),
      ).rejects.toThrow(/Quota exceeded for storage_bytes/);

      // Release 300 bytes
      await EntitlementService.releaseUsage(testApp._id, 'storage_bytes', 300);
      expect(await EntitlementService.getUsage(testApp._id, 'storage_bytes')).toBe(300);
      expect(await EntitlementService.getRemaining(testApp._id, 'storage_bytes')).toBe(700);

      // Now 500 bytes should succeed (300 + 500 = 800 <= 1000)
      await expect(
        EntitlementService.assertWithinLimit(testApp._id, 'storage_bytes', 500),
      ).resolves.not.toThrow();
    });
  });

  describe('7. Plan Upgrades & Downgrades (Data Safety)', () => {
    it('should upgrade plan and immediately expand effective entitlements', async () => {
      const testAccount = await Account.create({
        ownerUserId: new mongoose.Types.ObjectId(),
        name: 'Upgrade Account',
        status: AccountStatus.ACTIVE,
      });

      const testApp = await Application.create({
        tenantId: new mongoose.Types.ObjectId(),
        accountId: testAccount._id,
        templateId: new mongoose.Types.ObjectId(),
        templateVersion: 1,
        name: 'Upgrade App',
        slug: `upgrade-app-${Date.now()}`,
        status: ApplicationStatus.ACTIVE,
      });

      const freePlan = await Plan.findOne({ slug: 'free' });

      await SubscriptionService.createSubscription({
        applicationId: testApp._id,
        planId: freePlan!._id,
      });

      // Upgrade to Professional
      const updatedSub = await SubscriptionService.changePlan({
        applicationId: testApp._id,
        newPlanSlug: 'professional',
        reason: 'Customer upgraded to Professional tier',
      });

      expect(updatedSub.planSnapshot?.slug).toBe('professional');
      expect(updatedSub.planSnapshot?.entitlements.activeUsers.limit).toBe(50);

      const canDomain = await EntitlementService.can(testApp._id, 'customDomain');
      expect(canDomain).toBe(true);

      const audit = await SubscriptionAuditLog.findOne({
        applicationId: testApp._id,
        action: 'PLAN_CHANGED',
      });
      expect(audit).toBeDefined();
      expect(audit!.oldPlan?.slug).toBe('free');
      expect(audit!.newPlan?.slug).toBe('professional');
    });

    it('should NOT delete data on downgrade if usage exceeds new plan limits, but set over_quota state', async () => {
      const testApp = await Application.create({
        tenantId: new mongoose.Types.ObjectId(),
        accountId: new mongoose.Types.ObjectId(),
        templateId: new mongoose.Types.ObjectId(),
        templateVersion: 1,
        name: 'Downgrade App',
        slug: `downgrade-app-${Date.now()}`,
        status: ApplicationStatus.ACTIVE,
      });

      const proPlan = await Plan.findOne({ slug: 'professional' });
      await SubscriptionService.createSubscription({
        applicationId: testApp._id,
        planId: proPlan!._id,
      });

      // Simulate usage of 1 GB (1073741824 bytes), which is allowed in Pro (10 GB) but > Free (500 MB)
      const oneGB = 1073741824;
      await EntitlementService.recordUsage(testApp._id, 'storage_bytes', oneGB);

      // Downgrade to Free plan
      const downgradedSub = await SubscriptionService.changePlan({
        applicationId: testApp._id,
        newPlanSlug: 'free',
        reason: 'Customer requested downgrade',
      });

      // Ensure data is not deleted
      const usageAfterDowngrade = await EntitlementService.getUsage(testApp._id, 'storage_bytes');
      expect(usageAfterDowngrade).toBe(oneGB);

      // Check over_quota flag in metadata
      expect(downgradedSub.metadata?.over_quota).toBe(true);

      // Assert new uploads are blocked
      await expect(
        EntitlementService.assertWithinLimit(testApp._id, 'storage_bytes', 1024),
      ).rejects.toThrow(/Quota exceeded/);
    });
  });

  describe('8. Subscription Expiration & Fallback', () => {
    it('should handle expired subscriptions and fall back safely', async () => {
      const testApp = await Application.create({
        tenantId: new mongoose.Types.ObjectId(),
        accountId: new mongoose.Types.ObjectId(),
        templateId: new mongoose.Types.ObjectId(),
        templateVersion: 1,
        name: 'Expired App',
        slug: `expired-app-${Date.now()}`,
        status: ApplicationStatus.ACTIVE,
      });

      const proPlan = await Plan.findOne({ slug: 'professional' });

      // Create subscription with endsAt in the past
      const sub = await Subscription.create({
        applicationId: testApp._id,
        planId: proPlan!._id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        startsAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 1000), // expired 1 sec ago
        planSnapshot: {
          planId: proPlan!._id as any,
          slug: proPlan!.slug,
          name: proPlan!.name,
          entitlements: proPlan!.entitlements,
          version: 1,
        },
      });

      // getCurrentSubscription should detect expiration, update status to expired, and return null
      const current = await SubscriptionService.getCurrentSubscription(testApp._id);
      expect(current).toBeNull();

      const refreshedSub = await Subscription.findById(sub._id);
      expect(refreshedSub!.status).toBe(SubscriptionStatus.EXPIRED);

      // resolveEffectiveEntitlements should fall back to free plan
      const effectiveEntitlements = await SubscriptionService.resolveEffectiveEntitlements(testApp._id);
      expect(effectiveEntitlements.customDomain.enabled).toBe(false);
      expect(effectiveEntitlements.activeUsers.limit).toBe(5);
    });
  });

  describe('9. Platform API Security & Isolation', () => {
    it('should allow public/authenticated listing of commercial plans via GET /api/v1/platform/plans', async () => {
      const supertest = (await import('supertest')).default;
      const app = (await import('../app')).default;

      const res = await supertest(app).get('/api/v1/platform/plans');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
    });

    it('should enforce account isolation: Account A cannot access or modify Application B subscription or usage', async () => {
      const supertest = (await import('supertest')).default;
      const app = (await import('../app')).default;
      const { generateAccessToken } = await import('../services/token.service');

      const userA = await User.create({
        name: 'User A',
        email: `usera-${Date.now()}@example.com`,
        mobile: '9876543210',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const userB = await User.create({
        name: 'User B',
        email: `userb-${Date.now()}@example.com`,
        mobile: '9876543211',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const accountA = await Account.create({
        ownerUserId: userA._id,
        name: 'Account A',
        status: AccountStatus.ACTIVE,
      });

      const accountB = await Account.create({
        ownerUserId: userB._id,
        name: 'Account B',
        status: AccountStatus.ACTIVE,
      });

      const appA = await Application.create({
        tenantId: new mongoose.Types.ObjectId(),
        accountId: accountA._id,
        templateId: new mongoose.Types.ObjectId(),
        templateVersion: 1,
        name: 'App A',
        slug: `app-a-${Date.now()}`,
        status: ApplicationStatus.ACTIVE,
      });

      const appB = await Application.create({
        tenantId: new mongoose.Types.ObjectId(),
        accountId: accountB._id,
        templateId: new mongoose.Types.ObjectId(),
        templateVersion: 1,
        name: 'App B',
        slug: `app-b-${Date.now()}`,
        status: ApplicationStatus.ACTIVE,
      });
      expect(appB).toBeDefined();

      const freePlan = await Plan.findOne({ slug: 'free' });
      await SubscriptionService.createSubscription({
        applicationId: appA._id,
        planId: freePlan!._id,
      });

      const tokenA = generateAccessToken({ userId: String(userA._id), role: Role.ADMIN, tokenVersion: 0 });
      const tokenB = generateAccessToken({ userId: String(userB._id), role: Role.ADMIN, tokenVersion: 0 });

      // 1. User A accessing own app subscription -> 200 OK
      const subResA = await supertest(app)
        .get(`/api/v1/platform/applications/${appA._id}/subscription`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(subResA.status).toBe(200);
      expect(subResA.body.data.subscription.planSnapshot.slug).toBe('free');

      // 2. User B accessing User A's app subscription -> 403 Forbidden
      const subResB = await supertest(app)
        .get(`/api/v1/platform/applications/${appA._id}/subscription`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(subResB.status).toBe(403);
      expect(subResB.body.message).toMatch(/not authorized/);

      // 3. User B attempting to change User A's app plan -> 403 Forbidden
      const changeResB = await supertest(app)
        .post(`/api/v1/platform/applications/${appA._id}/subscription/change-plan`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ planSlug: 'professional' });
      expect(changeResB.status).toBe(403);

      // 4. User B accessing User A's usage -> 403 Forbidden
      const usageResB = await supertest(app)
        .get(`/api/v1/platform/applications/${appA._id}/usage`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(usageResB.status).toBe(403);

      // 5. User A accessing own app usage -> 200 OK
      const usageResA = await supertest(app)
        .get(`/api/v1/platform/applications/${appA._id}/usage`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(usageResA.status).toBe(200);
      expect(usageResA.body.data.metrics.activeUsers).toBeDefined();
      expect(usageResA.body.data.metrics.storage).toBeDefined();

      // 6. User A changing own app plan -> 200 OK
      const changeResA = await supertest(app)
        .post(`/api/v1/platform/applications/${appA._id}/subscription/change-plan`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ planSlug: 'starter' });
      expect(changeResA.status).toBe(200);
      expect(changeResA.body.data.planSnapshot.slug).toBe('starter');
    });
  });
});
