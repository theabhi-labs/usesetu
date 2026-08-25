import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { env } from '../config/env';
import app from '../app';
import { Application, ApplicationStatus } from '../models/application.model';
import { Tenant, TenantStatus } from '../models/tenant.model';
import { Account, AccountStatus } from '../models/account.model';
import { ApplicationTemplate, TemplateStatus } from '../models/applicationTemplate.model';
import { Plan } from '../models/plan.model';
import { User } from '../models/user.model';
import { PlatformNotification, PlatformNotificationCategory, PlatformNotificationType } from '../models/platformNotification.model';
import { Role } from '../types/auth.types';
import { generateAccessToken } from '../services/token.service';
import { ApplicationProvisioningService } from '../services/applicationProvisioning.service';
import { seedPlans } from '../seeders/planAndSubscription.seeder';

describe('UseSetu Stage 6 — Platform Control Plane & Dashboard Test Suite', () => {
  let userA: any;
  let userB: any;
  let tokenA: string;
  let tokenB: string;
  let accountA: any;
  let accountB: any;
  let appA1: any;
  let appA2: any;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }
    await seedPlans();

    // Ensure digital-service-center template exists
    let dscTemplate = await ApplicationTemplate.findOne({ slug: 'digital-service-center' });
    if (!dscTemplate) {
      dscTemplate = await ApplicationTemplate.create({
        name: 'Digital Service Center',
        slug: 'digital-service-center',
        category: 'digital_service_center',
        description: 'Reusable blueprint for creating Common Service Centers',
        status: TemplateStatus.ACTIVE,
        version: 1,
      });
    }

    const stamp = Date.now();

    // Setup Account A & User A
    userA = await User.create({
      name: 'Owner Alice',
      email: `alice.platform.${stamp}@test.com`,
      mobile: '9876543210',
      password: 'Password123!',
      role: Role.ADMIN,
      tenantId: new mongoose.Types.ObjectId(),
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });

    accountA = await Account.create({
      name: "Alice's Enterprises",
      ownerUserId: userA._id,
      status: AccountStatus.ACTIVE,
    });

    tokenA = generateAccessToken({
      userId: String(userA._id),
      role: Role.ADMIN,
      tokenVersion: 0,
    });

    // Setup Account B & User B
    userB = await User.create({
      name: 'Owner Bob',
      email: `bob.platform.${stamp}@test.com`,
      mobile: '9876543211',
      password: 'Password123!',
      role: Role.ADMIN,
      tenantId: new mongoose.Types.ObjectId(),
      isEmailVerified: true,
      isMobileVerified: true,
      isActive: true,
    });

    accountB = await Account.create({
      name: "Bob's Enterprises",
      ownerUserId: userB._id,
      status: AccountStatus.ACTIVE,
    });

    tokenB = generateAccessToken({
      userId: String(userB._id),
      role: Role.ADMIN,
      tokenVersion: 0,
    });

    // Provision App A1 (Free Plan)
    const provA1 = await ApplicationProvisioningService.provisionApplication({
      accountId: String(accountA._id),
      ownerId: String(userA._id),
      name: 'Alice Center Alpha',
      slug: `alice-alpha-${stamp}`,
      templateSlug: 'digital-service-center',
    });
    appA1 = provA1.application;

    // Provision App A2 (Starter Plan)
    const provA2 = await ApplicationProvisioningService.provisionApplication({
      accountId: String(accountA._id),
      ownerId: String(userA._id),
      name: 'Alice Center Beta',
      slug: `alice-beta-${stamp}`,
      templateSlug: 'digital-service-center',
    });
    appA2 = provA2.application;

    // Provision App B1 for User B
    await ApplicationProvisioningService.provisionApplication({
      accountId: String(accountB._id),
      ownerId: String(userB._id),
      name: 'Bob Center One',
      slug: `bob-one-${stamp}`,
      templateSlug: 'digital-service-center',
    });
  }, 40000);

  afterAll(async () => {
    await mongoose.disconnect();
  });

  // 1. Dashboard Authentication & Account Isolation
  describe('1. Platform Dashboard Aggregation & Isolation', () => {
    it('should reject unauthenticated request to /platform/dashboard with 401', async () => {
      const res = await supertest(app).get('/api/v1/platform/dashboard');
      expect(res.status).toBe(401);
    });

    it('should return aggregated platform dashboard for Account A with correct app count', async () => {
      const res = await supertest(app)
        .get('/api/v1/platform/dashboard')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.account.name).toBe("Alice's Enterprises");
      expect(res.body.data.metrics.totalApplications).toBe(2);
      expect(res.body.data.metrics.activeApplications).toBe(2);
      expect(res.body.data.applications).toHaveLength(2);
      expect(res.body.data.applications.map((a: any) => a.name)).toContain('Alice Center Alpha');
      expect(res.body.data.applications.map((a: any) => a.name)).not.toContain('Bob Center One');
    });

    it('should return isolated dashboard for Account B only including Bob applications', async () => {
      const res = await supertest(app)
        .get('/api/v1/platform/dashboard')
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.account.name).toBe("Bob's Enterprises");
      expect(res.body.data.metrics.totalApplications).toBe(1);
      expect(res.body.data.applications).toHaveLength(1);
      expect(res.body.data.applications[0].name).toBe('Bob Center One');
    });
  });

  // 2. Application List with Filters & Pagination
  describe('2. Application Listing & Search', () => {
    it('should list only applications belonging to the authenticated account', async () => {
      const res = await supertest(app)
        .get('/api/v1/platform/applications')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('should support search filtering by application name or slug', async () => {
      const res = await supertest(app)
        .get('/api/v1/platform/applications?search=Alpha')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Alice Center Alpha');
    });

    it('should support status filtering', async () => {
      const res = await supertest(app)
        .get('/api/v1/platform/applications?status=active')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // 3. Application Detail & Security Boundary
  describe('3. Application Detail & Cross-Account Protection', () => {
    it('should return application detail for owner', async () => {
      const res = await supertest(app)
        .get(`/api/v1/platform/applications/${appA1._id}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Alice Center Alpha');
      expect(res.body.data.subscription).toBeDefined();
    });

    it('should forbid Account B from viewing Account A application with 403', async () => {
      const res = await supertest(app)
        .get(`/api/v1/platform/applications/${appA1._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent application id', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await supertest(app)
        .get(`/api/v1/platform/applications/${fakeId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });
  });

  // 4. Application Settings & Branding Management
  describe('4. Application Settings & Whitelist Protection', () => {
    it('should fetch application settings & branding', async () => {
      const res = await supertest(app)
        .get(`/api/v1/platform/applications/${appA1._id}/settings`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.name).toBe('Alice Center Alpha');
      expect(res.body.data.branding).toBeDefined();
    });

    it('should safely update whitelisted branding fields for verified application tenant', async () => {
      const res = await supertest(app)
        .patch(`/api/v1/platform/applications/${appA1._id}/settings`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          cscName: 'Alice Digital Seva Kendra',
          tagline: 'Fast and Reliable Citizen Services',
          logoUrl: 'https://cdn.usesetu.com/alice-logo.png',
          theme: {
            primaryColor: '#E65100',
            secondaryColor: '#1A1A1A',
            accentColor: '#FFB300',
          },
          contact: {
            email: 'help@alicedigital.in',
            phone: '9876543210',
            address: '123 Market Road, Jaipur',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.branding.cscName).toBe('Alice Digital Seva Kendra');
      expect(res.body.data.branding.logoUrl).toBe('https://cdn.usesetu.com/alice-logo.png');
      expect(res.body.data.branding.theme.primaryColor).toBe('#E65100');
    });

    it('should ignore/reject forbidden fields (tenantId, accountId, status)', async () => {
      const origApp = await Application.findById(appA1._id);

      await supertest(app)
        .patch(`/api/v1/platform/applications/${appA1._id}/settings`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: 'Updated Alpha Name',
          tenantId: new mongoose.Types.ObjectId().toString(),
          accountId: new mongoose.Types.ObjectId().toString(),
          status: 'suspended',
        });

      const reloadedApp = await Application.findById(appA1._id);
      expect(reloadedApp?.name).toBe('Updated Alpha Name');
      expect(reloadedApp?.tenantId.toString()).toBe(origApp?.tenantId.toString());
      expect(reloadedApp?.accountId.toString()).toBe(origApp?.accountId.toString());
      expect(reloadedApp?.status).toBe(ApplicationStatus.ACTIVE);
    });

    it('should forbid Account B from modifying Account A settings with 403', async () => {
      const res = await supertest(app)
        .patch(`/api/v1/platform/applications/${appA1._id}/settings`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          cscName: 'Hacked by Bob',
        });

      expect(res.status).toBe(403);
    });
  });

  // 5. Application Lifecycle (Suspend, Resume, Archive)
  describe('5. Application Lifecycle Transitions', () => {
    it('should allow owner to suspend an active application', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA2._id}/suspend`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ reason: 'Maintenance work' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ApplicationStatus.SUSPENDED);

      // Verify tenant is also suspended
      const tenant = await Tenant.findById(appA2.tenantId);
      expect(tenant?.status).toBe(TenantStatus.SUSPENDED);
    });

    it('should reject suspending an already suspended application', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA2._id}/suspend`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ reason: 'Suspend again' });

      expect(res.status).toBe(400);
    });

    it('should allow owner to resume a suspended application', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA2._id}/resume`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ reason: 'Maintenance completed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ApplicationStatus.ACTIVE);

      // Verify tenant is also active
      const tenant = await Tenant.findById(appA2.tenantId);
      expect(tenant?.status).toBe(TenantStatus.ACTIVE);
    });

    it('should soft-archive an application without deleting records', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA2._id}/archive`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ reason: 'Center retired' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ApplicationStatus.ARCHIVED);

      // Verify application still exists in DB
      const appRecord = await Application.findById(appA2._id);
      expect(appRecord).not.toBeNull();
      expect(appRecord?.status).toBe(ApplicationStatus.ARCHIVED);
    });

    it('should reject resuming an archived application', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA2._id}/resume`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ reason: 'Try resume' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/archived/i);
    });

    it('should forbid Account B from archiving Account A application', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/archive`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
    });
  });

  // 6. Billing & Subscription Management
  describe('6. Billing Overview & Plan Operations', () => {
    it('should return account billing overview with subscriptions', async () => {
      const res = await supertest(app)
        .get('/api/v1/platform/billing')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subscriptions.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.transactions).toEqual([]);
    });

    it('should return all available plan tiers from DB', async () => {
      const res = await supertest(app)
        .get('/api/v1/platform/plans')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(4);
      const planSlugs = res.body.data.map((p: any) => p.slug);
      expect(planSlugs).toContain('free');
      expect(planSlugs).toContain('starter');
      expect(planSlugs).toContain('professional');
    });

    it('should allow owner to upgrade application plan from free to starter', async () => {
      const starterPlan = await Plan.findOne({ slug: 'starter' });
      expect(starterPlan).not.toBeNull();

      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/subscription/change-plan`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          planId: starterPlan!._id.toString(),
          billingCycle: 'monthly',
          reason: 'Upgrade to starter for custom domains',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plan.slug).toBe('starter');
    });

    it('should allow owner to cancel subscription gracefully', async () => {
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/subscription/cancel`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          reason: 'Testing cancellation flow',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should forbid Account B from changing Account A plan', async () => {
      const starterPlan = await Plan.findOne({ slug: 'starter' });

      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${appA1._id}/subscription/change-plan`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          planId: starterPlan!._id.toString(),
          billingCycle: 'monthly',
        });

      expect(res.status).toBe(403);
    });
  });

  // 7. Account Profile & Security
  describe('7. Account Profile & Security Management', () => {
    it('should get authenticated account profile', async () => {
      const res = await supertest(app)
        .get('/api/v1/platform/account')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Owner Alice');
      expect(res.body.data.account.name).toBe("Alice's Enterprises");
    });

    it('should safely update account display name and user mobile', async () => {
      const res = await supertest(app)
        .patch('/api/v1/platform/account')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          accountName: 'Alice Global Hub',
          mobile: '9876543299',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.account.name).toBe('Alice Global Hub');
      expect(res.body.data.user.mobile).toBe('9876543299');
    });

    it('should return security metadata without password or secret leakage', async () => {
      const res = await supertest(app)
        .get('/api/v1/platform/account/security')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.securityStatus).toBe('SECURE');
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.tokenVersion).toBeUndefined();
    });
  });

  // 8. Platform Notifications
  describe('8. Platform Notification Feed & Mark-as-Read', () => {
    let notifId: string;

    beforeAll(async () => {
      const notif = await PlatformNotification.create({
        accountId: accountA._id,
        applicationId: appA1._id,
        category: PlatformNotificationCategory.QUOTA,
        type: PlatformNotificationType.WARNING,
        title: 'Storage at 85% capacity',
        message: 'Your application is approaching storage capacity.',
        isRead: false,
      });
      notifId = notif._id.toString();
    });

    it('should return notifications list for Account A', async () => {
      const res = await supertest(app)
        .get('/api/v1/platform/notifications')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notifications.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow marking a single notification as read', async () => {
      const res = await supertest(app)
        .patch(`/api/v1/platform/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
    });

    it('should allow marking all notifications as read', async () => {
      const res = await supertest(app)
        .patch('/api/v1/platform/notifications/read-all')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should forbid Account B from marking Account A notification as read', async () => {
      const res = await supertest(app)
        .patch(`/api/v1/platform/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
    });
  });
});
