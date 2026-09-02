import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { env } from '../config/env';
import app from '../app';
import { Application, ApplicationStatus } from '../models/application.model';
import { ApplicationDomain, DomainStatus, DomainType } from '../models/applicationDomain.model';
import { TenantStatus } from '../models/tenant.model';
import { Account, AccountStatus } from '../models/account.model';
import { ApplicationTemplate, TemplateStatus } from '../models/applicationTemplate.model';
import { SubscriptionStatus } from '../models/subscription.model';
import { UsageRecord } from '../models/usageRecord.model';
import { WebsiteSetting } from '../models/websiteSetting.model';
import { User } from '../models/user.model';
import { Role } from '../types/auth.types';
import { generateAccessToken } from '../services/token.service';
import { ApplicationProvisioningService } from '../services/applicationProvisioning.service';
import { DomainResolverService } from '../services/domainResolver.service';
import { seedPlans } from '../seeders/planAndSubscription.seeder';

describe('UseSetu Stage 4 — Create App, Provisioning, Default Domain & Management', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }
    await seedPlans();

    // Ensure digital-service-center template exists
    const dscTemplate = await ApplicationTemplate.findOne({ slug: 'digital-service-center' });
    if (!dscTemplate) {
      await ApplicationTemplate.create({
        name: 'Digital Service Center',
        slug: 'digital-service-center',
        category: 'digital_service_center',
        description: 'Reusable blueprint for creating Common Service Centers',
        status: TemplateStatus.ACTIVE,
        version: 1,
      });
    }

    // Ensure an inactive template for negative tests
    const inactiveTemplate = await ApplicationTemplate.findOne({ slug: 'inactive-blueprint' });
    if (!inactiveTemplate) {
      await ApplicationTemplate.create({
        name: 'Inactive Blueprint',
        slug: 'inactive-blueprint',
        category: 'digital_service_center',
        description: 'Template that is disabled',
        status: TemplateStatus.DEPRECATED,
        version: 1,
      });
    }
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('1. Slug Validation & Availability Engine', () => {
    it('should approve valid slugs', async () => {
      const result = await ApplicationProvisioningService.checkSlugAvailability('sharma-digital-center');
      expect(result.available).toBe(true);
      expect(result.slug).toBe('sharma-digital-center');
    });

    it('should reject invalid slug formats (spaces, underscores, uppercase, special characters)', async () => {
      const invalidSlugs = ['Sharma Center', 'sharma_center', 'sharma@center', 'sharma--center', '-leading', 'trailing-', 'ab'];
      for (const badSlug of invalidSlugs) {
        const result = await ApplicationProvisioningService.checkSlugAvailability(badSlug);
        expect(result.available).toBe(false);
      }
    });

    it('should reject reserved system slugs', async () => {
      const reservedList = ['admin', 'api', 'app', 'dashboard', 'login', 'register', 'platform', 'usesetu', 'billing'];
      for (const resSlug of reservedList) {
        const result = await ApplicationProvisioningService.checkSlugAvailability(resSlug);
        expect(result.available).toBe(false);
        expect(result.reason).toMatch(/reserved/i);
      }
    });

    it('should expose public slug availability via GET /api/v1/platform/applications/slug/:slug/availability', async () => {
      const res = await supertest(app).get('/api/v1/platform/applications/slug/my-unique-center/availability');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(true);
      expect(res.body.data.slug).toBe('my-unique-center');
    });
  });

  describe('2. Safe Application Provisioning Pipeline', () => {
    it('should provision application with Tenant, Domain, Subscription, Usage, and Settings in ACTIVE state', async () => {
      const user = await User.create({
        name: 'Owner Stage 4',
        email: `owner4-${Date.now()}@example.com`,
        mobile: '9876543220',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({
        ownerUserId: user._id,
        name: 'Stage 4 Main Account',
        status: AccountStatus.ACTIVE,
      });

      const slug = `app-prov-${Date.now()}`;
      const result = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'Gupta Digital Seva Kendra',
        slug,
        templateSlug: 'digital-service-center',
      });

      // 1. Application checks
      expect(result.application).toBeDefined();
      expect(result.application.name).toBe('Gupta Digital Seva Kendra');
      expect(result.application.slug).toBe(slug);
      expect(result.application.status).toBe(ApplicationStatus.ACTIVE);

      // 2. Tenant checks
      expect(result.tenant).toBeDefined();
      expect(result.tenant.status).toBe(TenantStatus.ACTIVE);
      expect(String(result.application.tenantId)).toBe(String(result.tenant._id));

      // 3. Domain checks
      expect(result.domain).toBeDefined();
      expect(result.domain.hostname).toBe(`${slug}.${env.PLATFORM_BASE_DOMAIN}`);
      expect(result.domain.type).toBe(DomainType.DEFAULT);
      expect(result.domain.status).toBe(DomainStatus.ACTIVE);

      // 4. Subscription checks
      expect(result.subscription).toBeDefined();
      expect(result.subscription.status).toBe(SubscriptionStatus.ACTIVE);
      expect(result.subscription.planSnapshot?.slug).toBe('free');

      // 5. Usage checks
      const userUsage = await UsageRecord.findOne({ applicationId: result.application._id, metric: 'active_users' });
      expect(userUsage).toBeDefined();
      expect(userUsage?.used).toBe(0);

      // 6. Settings check
      const setting = await WebsiteSetting.findOne({ _id: String(result.tenant._id) }).setOptions({ bypassTenantQuery: true });
      expect(setting).toBeDefined();
      expect(setting?.websiteName).toBe('Gupta Digital Seva Kendra');
    });

    it('should reject provisioning with an inactive or non-existent template', async () => {
      const fakeAccountId = new mongoose.Types.ObjectId();
      const fakeOwnerId = new mongoose.Types.ObjectId();

      await expect(
        ApplicationProvisioningService.provisionApplication({
          accountId: String(fakeAccountId),
          ownerId: String(fakeOwnerId),
          name: 'Invalid Template App',
          slug: `inv-temp-${Date.now()}`,
          templateSlug: 'non-existent-template',
        }),
      ).rejects.toThrow(/not found or inactive/);
    });

    it('should reject duplicate slug creation on second attempt', async () => {
      const user = await User.create({
        name: 'Dup Owner',
        email: `dupowner-${Date.now()}@example.com`,
        mobile: '9876543221',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({
        ownerUserId: user._id,
        name: 'Dup Account',
        status: AccountStatus.ACTIVE,
      });

      const slug = `dup-slug-${Date.now()}`;
      await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'First App',
        slug,
        templateSlug: 'digital-service-center',
      });

      // Attempt second creation with same slug
      await expect(
        ApplicationProvisioningService.provisionApplication({
          accountId: String(account._id),
          ownerId: String(user._id),
          name: 'Second App',
          slug,
          templateSlug: 'digital-service-center',
        }),
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('3. Idempotency & Rollback Safety', () => {
    it('should return cached result when duplicate request with same Idempotency-Key is sent', async () => {
      const user = await User.create({
        name: 'Idempotent User',
        email: `idempotent-${Date.now()}@example.com`,
        mobile: '9876543222',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({
        ownerUserId: user._id,
        name: 'Idempotent Account',
        status: AccountStatus.ACTIVE,
      });

      const slug = `idem-app-${Date.now()}`;
      const idempotencyKey = `key-${Date.now()}`;

      // First call
      const res1 = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'Idempotent App',
        slug,
        templateSlug: 'digital-service-center',
        idempotencyKey,
      });

      // Second call with same idempotency key
      const res2 = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'Idempotent App',
        slug,
        templateSlug: 'digital-service-center',
        idempotencyKey,
      });

      expect(String(res1.application._id)).toBe(String(res2.application._id));

      // Verify no duplicate applications or tenants were created in DB
      const appCount = await Application.countDocuments({ slug });
      expect(appCount).toBe(1);
    });

    it('should handle concurrent requests for same slug safely (1 succeeds, 1 gets rejected)', async () => {
      const user = await User.create({
        name: 'Concurrent User',
        email: `concurrent-${Date.now()}@example.com`,
        mobile: '9876543223',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({
        ownerUserId: user._id,
        name: 'Concurrent Account',
        status: AccountStatus.ACTIVE,
      });

      const slug = `conc-app-${Date.now()}`;

      // Fire 2 simultaneous provisioning requests for the exact same slug
      const results = await Promise.allSettled([
        ApplicationProvisioningService.provisionApplication({
          accountId: String(account._id),
          ownerId: String(user._id),
          name: 'Concurrent App 1',
          slug,
          templateSlug: 'digital-service-center',
        }),
        ApplicationProvisioningService.provisionApplication({
          accountId: String(account._id),
          ownerId: String(user._id),
          name: 'Concurrent App 2',
          slug,
          templateSlug: 'digital-service-center',
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Verify exactly 1 application and 1 domain exist in DB
      const appCount = await Application.countDocuments({ slug });
      expect(appCount).toBe(1);

      const domainCount = await ApplicationDomain.countDocuments({
        hostname: `${slug}.${env.PLATFORM_BASE_DOMAIN}`,
      });
      expect(domainCount).toBe(1);
    });
  });

  describe('4. Domain Resolution & Security Context', () => {
    it('should resolve incoming hostname to Application, Tenant, and Domain', async () => {
      const user = await User.create({
        name: 'Domain Owner',
        email: `domowner-${Date.now()}@example.com`,
        mobile: '9876543224',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({
        ownerUserId: user._id,
        name: 'Domain Account',
        status: AccountStatus.ACTIVE,
      });

      const slug = `domain-test-${Date.now()}`;
      const prov = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'Domain Test Center',
        slug,
        templateSlug: 'digital-service-center',
      });

      const hostname = `${slug}.${env.PLATFORM_BASE_DOMAIN}`;
      const resolved = await DomainResolverService.resolveHostname(hostname);

      expect(resolved).toBeDefined();
      expect(String(resolved!.application._id)).toBe(String(prov.application._id));
      expect(String(resolved!.tenant._id)).toBe(String(prov.tenant._id));
      expect(resolved!.domain.hostname).toBe(hostname);
    });

    it('should reject request when Host Tenant and JWT Tenant mismatch (403 Forbidden)', async () => {
      const tenantAId = new mongoose.Types.ObjectId();

      const userA = await User.create({
        name: 'User A',
        email: `usera-mismatch-${Date.now()}@example.com`,
        mobile: '9876543225',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: tenantAId,
        isEmailVerified: true,
        isActive: true,
      });

      const accountB = await Account.create({
        ownerUserId: new mongoose.Types.ObjectId(),
        name: 'Account B',
        status: AccountStatus.ACTIVE,
      });

      // App B with Tenant B
      const slugB = `app-b-${Date.now()}`;
      const appB = await ApplicationProvisioningService.provisionApplication({
        accountId: String(accountB._id),
        ownerId: String(accountB.ownerUserId),
        name: 'App B Center',
        slug: slugB,
        templateSlug: 'digital-service-center',
      });
      expect(appB).toBeDefined();

      const tokenUserA = generateAccessToken({ userId: String(userA._id), role: Role.ADMIN, tokenVersion: 0 });
      const hostB = `${slugB}.${env.PLATFORM_BASE_DOMAIN}`;

      // User A (Tenant A) attempts to access App B (Tenant B) host -> must be rejected with 403
      const res = await supertest(app)
        .get('/api/v1/services')
        .set('Host', hostB)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/mismatch/i);
    });
  });

  describe('5. Public Application Context API', () => {
    it('should return safe public metadata without leaking secrets, API keys, or credentials', async () => {
      const user = await User.create({
        name: 'Public Context Owner',
        email: `pubcontext-${Date.now()}@example.com`,
        mobile: '9876543226',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({
        ownerUserId: user._id,
        name: 'Public Context Account',
        status: AccountStatus.ACTIVE,
      });

      const slug = `public-app-${Date.now()}`;
      const prov = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'Public Seva Kendra',
        slug,
        templateSlug: 'digital-service-center',
      });
      expect(prov).toBeDefined();

      const hostname = `${slug}.${env.PLATFORM_BASE_DOMAIN}`;

      const res = await supertest(app)
        .get('/api/v1/public/application/context')
        .set('Host', hostname);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application.name).toBe('Public Seva Kendra');
      expect(res.body.data.application.slug).toBe(slug);
      expect(res.body.data.template.slug).toBe('digital-service-center');
      expect(res.body.data.branding.websiteName).toBe('Public Seva Kendra');

      // Ensure no internal credentials/keys are exposed
      expect(res.body.data.tenantId).toBeUndefined();
      expect(res.body.data.accountId).toBeUndefined();
      expect(res.body.data.jwtSecret).toBeUndefined();
      expect(res.body.data.apiKey).toBeUndefined();
    });
  });

  describe('6. Platform Dashboard & Application Management APIs', () => {
    it('should list applications with domain and subscription info for authenticated user', async () => {
      const user = await User.create({
        name: 'Dashboard User',
        email: `dashuser-${Date.now()}@example.com`,
        mobile: '9876543227',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({
        ownerUserId: user._id,
        name: 'Dashboard Account',
        status: AccountStatus.ACTIVE,
      });

      const slug = `dash-app-${Date.now()}`;
      await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'Dashboard Service Center',
        slug,
        templateSlug: 'digital-service-center',
      });

      const token = generateAccessToken({ userId: String(user._id), role: Role.ADMIN, tokenVersion: 0 });

      const res = await supertest(app)
        .get('/api/v1/platform/applications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const createdApp = res.body.data.find((a: any) => a.slug === slug);
      expect(createdApp).toBeDefined();
      expect(createdApp.defaultDomain).toBe(`${slug}.${env.PLATFORM_BASE_DOMAIN}`);
      expect(createdApp.subscription.plan).toBe('Free');
    });

    it('should enforce account isolation: Account A cannot access or manage Account B application', async () => {
      const userA = await User.create({
        name: 'User A Stage 4',
        email: `usera4-${Date.now()}@example.com`,
        mobile: '9876543228',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const userB = await User.create({
        name: 'User B Stage 4',
        email: `userb4-${Date.now()}@example.com`,
        mobile: '9876543229',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const accountA = await Account.create({ ownerUserId: userA._id, name: 'Account A', status: AccountStatus.ACTIVE });
      const accountB = await Account.create({ ownerUserId: userB._id, name: 'Account B', status: AccountStatus.ACTIVE });
      expect(accountB).toBeDefined();

      const appA = await ApplicationProvisioningService.provisionApplication({
        accountId: String(accountA._id),
        ownerId: String(userA._id),
        name: 'App A',
        slug: `appa-${Date.now()}`,
        templateSlug: 'digital-service-center',
      });

      const tokenB = generateAccessToken({ userId: String(userB._id), role: Role.ADMIN, tokenVersion: 0 });

      // User B tries to access App A details
      const res = await supertest(app)
        .get(`/api/v1/platform/applications/${appA.application._id}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });
  });
});
