import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { env } from '../config/env';
import app from '../app';
import { Application, ApplicationStatus } from '../models/application.model';
import { ApplicationDomain, DomainStatus, DomainType, SslStatus, VerificationMethod } from '../models/applicationDomain.model';
import { Tenant, TenantStatus } from '../models/tenant.model';
import { Account, AccountStatus } from '../models/account.model';
import { ApplicationTemplate, TemplateStatus } from '../models/applicationTemplate.model';
import { Plan } from '../models/plan.model';
import { Subscription } from '../models/subscription.model';
import { User } from '../models/user.model';
import { Role } from '../types/auth.types';
import { generateAccessToken } from '../services/token.service';
import { ApplicationProvisioningService } from '../services/applicationProvisioning.service';
import { DomainNormalizationService } from '../services/domainNormalization.service';
import { DnsVerificationService } from '../services/dnsVerification.service';
import { DomainResolverService } from '../services/domainResolver.service';
import { ApplicationUrlService } from '../services/applicationUrl.service';
import { seedPlans } from '../seeders/planAndSubscription.seeder';

describe('UseSetu Stage 5 — Production-Ready Custom Domain Management & Verification', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGO_URI);
    }
    await seedPlans();

    // Ensure digital-service-center template exists
    let dscTemplate = await ApplicationTemplate.findOne({ slug: 'digital-service-center' });
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
  }, 30000);

  afterAll(async () => {
    DnsVerificationService.setMockResolver(null);
    await mongoose.disconnect();
  });

  describe('1. Domain Normalization & RFC Validation', () => {
    it('should normalize protocols, uppercase, ports, trailing dots, and paths', () => {
      expect(DomainNormalizationService.normalize('https://WWW.MyCenter.IN:443/home?q=1#top')).toBe('www.mycenter.in');
      expect(DomainNormalizationService.normalize('http://portal.csc.in./')).toBe('portal.csc.in');
      expect(DomainNormalizationService.normalize('  WWW.Example.COM.  ')).toBe('www.example.com');
    });

    it('should accept valid standard custom domains', () => {
      const res = DomainNormalizationService.validateCustomDomain('www.sharmacenter.in');
      expect(res.valid).toBe(true);
      expect(res.hostname).toBe('www.sharmacenter.in');
    });

    it('should reject invalid hostnames (spaces, special chars, wildcards, and invalid labels)', () => {
      const invalid = ['sharma center.in', '*.sharmacenter.in', 'sharma@center.in', '-leading.com', 'trailing-.com', 'ab'];
      for (const host of invalid) {
        const res = DomainNormalizationService.validateCustomDomain(host);
        expect(res.valid).toBe(false);
      }
    });

    it('should reject IP addresses and localhost as custom domains', () => {
      expect(DomainNormalizationService.validateCustomDomain('192.168.1.1').valid).toBe(false);
      expect(DomainNormalizationService.validateCustomDomain('127.0.0.1').valid).toBe(false);
      expect(DomainNormalizationService.validateCustomDomain('localhost').valid).toBe(false);
    });

    it('should reject reserved UseSetu infrastructure domains and *.usesetu.com', () => {
      const reserved = ['usesetu.com', 'www.usesetu.com', 'api.usesetu.com', 'admin.usesetu.com', 'domains.usesetu.com', 'custom.usesetu.com', 'other.usesetu.com'];
      for (const resHost of reserved) {
        const res = DomainNormalizationService.validateCustomDomain(resHost);
        expect(res.valid).toBe(false);
        expect(res.reason).toMatch(/reserved/i);
      }
    });
  });

  describe('2. Custom Domain Entitlement & Quota Enforcement', () => {
    it('should block custom domain creation on Free plan (403 FEATURE_NOT_AVAILABLE)', async () => {
      const user = await User.create({
        name: 'Free User St5',
        email: `free-st5-${Date.now()}@example.com`,
        mobile: '9876543301',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({ ownerUserId: user._id, name: 'Free Account', status: AccountStatus.ACTIVE });
      const prov = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'Free Tier Center',
        slug: `free-st5-${Date.now()}`,
        templateSlug: 'digital-service-center',
      });

      const token = generateAccessToken({ userId: String(user._id), role: Role.ADMIN, tokenVersion: 0 });

      // Attempt to add custom domain on free plan
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${prov.application._id}/domains`)
        .set('Authorization', `Bearer ${token}`)
        .send({ hostname: 'www.freecenternotallowed.in' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not enabled/i);
    });

    it('should allow custom domain addition on Professional plan and enforce quota limit (max 1)', async () => {
      const user = await User.create({
        name: 'Pro User St5',
        email: `pro-st5-${Date.now()}@example.com`,
        mobile: '9876543302',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({ ownerUserId: user._id, name: 'Pro Account', status: AccountStatus.ACTIVE });
      const prov = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'Pro Tier Center',
        slug: `pro-st5-${Date.now()}`,
        templateSlug: 'digital-service-center',
      });

      // Upgrade to Professional plan
      const proPlan = await Plan.findOne({ slug: 'professional' });
      await Subscription.findOneAndUpdate(
        { applicationId: prov.application._id },
        {
          $set: {
            planId: proPlan!._id,
            planSnapshot: {
              planId: proPlan!._id as any,
              slug: proPlan!.slug,
              name: proPlan!.name,
              entitlements: proPlan!.entitlements,
              version: proPlan!.version,
            },
          },
        },
      );

      const token = generateAccessToken({ userId: String(user._id), role: Role.ADMIN, tokenVersion: 0 });

      // 1. First custom domain -> should succeed (201)
      const res1 = await supertest(app)
        .post(`/api/v1/platform/applications/${prov.application._id}/domains`)
        .set('Authorization', `Bearer ${token}`)
        .send({ hostname: `www.procenter-${Date.now()}.in` });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.domain.status).toBe(DomainStatus.PENDING);
      expect(res1.body.data.verification.cname.target).toBe(env.CUSTOM_DOMAIN_CNAME_TARGET);

      // 2. Second custom domain -> should be rejected (403 limit reached)
      const res2 = await supertest(app)
        .post(`/api/v1/platform/applications/${prov.application._id}/domains`)
        .set('Authorization', `Bearer ${token}`)
        .send({ hostname: `www.secondpro-${Date.now()}.in` });

      expect(res2.status).toBe(403);
      expect(res2.body.message).toMatch(/limit reached/i);
    });
  });

  describe('3. Server-Side DNS Verification & Rate Limiting', () => {
    it('should reject incorrect CNAME DNS configuration', async () => {
      const user = await User.create({
        name: 'Dns User St5',
        email: `dns-st5-${Date.now()}@example.com`,
        mobile: '9876543303',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({ ownerUserId: user._id, name: 'Dns Account', status: AccountStatus.ACTIVE });
      const prov = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'DNS Verify Center',
        slug: `dns-st5-${Date.now()}`,
        templateSlug: 'digital-service-center',
      });

      const proPlan = await Plan.findOne({ slug: 'professional' });
      await Subscription.findOneAndUpdate(
        { applicationId: prov.application._id },
        {
          $set: {
            planId: proPlan!._id,
            planSnapshot: {
              planId: proPlan!._id as any,
              slug: proPlan!.slug,
              name: proPlan!.name,
              entitlements: proPlan!.entitlements,
              version: proPlan!.version,
            },
          },
        },
      );

      const customHost = `www.wrongtarget-${Date.now()}.in`;
      const domainDoc = await ApplicationDomain.create({
        applicationId: prov.application._id,
        hostname: customHost,
        type: DomainType.CUSTOM,
        status: DomainStatus.PENDING,
        sslStatus: SslStatus.PENDING,
        isPrimary: false,
        verificationMethod: VerificationMethod.CNAME,
        verificationToken: 'usesetu-verify-token-123',
        verificationExpectedValue: 'domains.usesetu.com',
      });

      // Mock DNS returning wrong CNAME target
      DnsVerificationService.setMockResolver({
        cnameResolver: async () => ['someotherhost.com'],
      });

      const token = generateAccessToken({ userId: String(user._id), role: Role.ADMIN, tokenVersion: 0 });

      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${prov.application._id}/domains/${domainDoc._id}/verify`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.verification.verified).toBe(false);
      expect(res.body.data.verification.code).toBe('WRONG_TARGET');

      const updated = await ApplicationDomain.findById(domainDoc._id);
      expect(updated?.status).toBe(DomainStatus.FAILED);
    });

    it('should verify correct CNAME configuration, provision SSL, and activate domain', async () => {
      const domainDoc = await ApplicationDomain.findOne({ hostname: { $regex: /^www\.wrongtarget/ } });
      expect(domainDoc).toBeDefined();

      domainDoc!.verificationAttempts = 0;
      domainDoc!.status = DomainStatus.PENDING;
      await domainDoc!.save();

      // Mock DNS returning correct target
      DnsVerificationService.setMockResolver({
        cnameResolver: async () => ['domains.usesetu.com'],
      });

      const user = await User.findOne({ email: { $regex: /^dns-st5/ } }).setOptions({ bypassTenantQuery: true });
      const token = generateAccessToken({ userId: String(user!._id), role: Role.ADMIN, tokenVersion: 0 });

      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${domainDoc!.applicationId}/domains/${domainDoc!._id}/verify`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.verification.verified).toBe(true);
      expect(res.body.data.domain.status).toBe(DomainStatus.ACTIVE);
      expect(res.body.data.domain.sslStatus).toBe(SslStatus.ACTIVE);

      const updated = await ApplicationDomain.findById(domainDoc!._id);
      expect(updated?.status).toBe(DomainStatus.ACTIVE);
      expect(updated?.verifiedAt).toBeDefined();
    });

    it('should verify TXT records for apex / root domains', async () => {
      const tokenVal = 'usesetu-verify-apex-12345';
      DnsVerificationService.setMockResolver({
        txtResolver: async () => [[`usesetu-verification=${tokenVal}`]],
      });

      const res = await DnsVerificationService.verifyTxt('apexcenter.in', tokenVal);
      expect(res.verified).toBe(true);
      expect(res.method).toBe('txt');
    });

    it('should enforce verification rate limiting (max 5 attempts in 10 minutes)', async () => {
      const domainDoc = await ApplicationDomain.findOne({ hostname: { $regex: /^www\.wrongtarget/ } });
      domainDoc!.verificationAttempts = 5;
      domainDoc!.lastVerificationAt = new Date();
      await domainDoc!.save();

      const user = await User.findOne({ email: { $regex: /^dns-st5/ } }).setOptions({ bypassTenantQuery: true });
      const token = generateAccessToken({ userId: String(user!._id), role: Role.ADMIN, tokenVersion: 0 });

      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${domainDoc!.applicationId}/domains/${domainDoc!._id}/verify`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/rate limit/i);
    });
  });

  describe('4. Custom Domain Resolution & Multi-Tenant Routing', () => {
    it('should resolve active custom domain to the correct Application and Tenant', async () => {
      const user = await User.create({
        name: 'Routing User St5',
        email: `routing-st5-${Date.now()}@example.com`,
        mobile: '9876543304',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({ ownerUserId: user._id, name: 'Routing Account', status: AccountStatus.ACTIVE });
      const prov = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'Live Custom Center',
        slug: `live-st5-${Date.now()}`,
        templateSlug: 'digital-service-center',
      });

      const activeCustomHost = `www.livecenter-${Date.now()}.in`;
      await ApplicationDomain.create({
        applicationId: prov.application._id,
        hostname: activeCustomHost,
        type: DomainType.CUSTOM,
        status: DomainStatus.ACTIVE,
        sslStatus: SslStatus.ACTIVE,
        isPrimary: true,
      });

      const resolved = await DomainResolverService.resolveHostname(activeCustomHost);
      expect(resolved).toBeDefined();
      expect(String(resolved!.application._id)).toBe(String(prov.application._id));
      expect(String(resolved!.tenant._id)).toBe(String(prov.tenant._id));
    });

    it('should NOT resolve pending or disabled custom domains for application traffic', async () => {
      const pendingHost = `www.pendingdomain-${Date.now()}.in`;
      await ApplicationDomain.create({
        applicationId: new mongoose.Types.ObjectId(),
        hostname: pendingHost,
        type: DomainType.CUSTOM,
        status: DomainStatus.PENDING,
      });

      const resolved = await DomainResolverService.resolveHostname(pendingHost);
      expect(resolved).toBeNull();
    });

    it('should enforce Host vs JWT tenant matching on custom domains (403 Forbidden)', async () => {
      const activeCustomHost = `www.livecenter-mismatch-${Date.now()}.in`;
      const tenantA = await Tenant.create({ name: 'Tenant A', slug: `tenant-a-${Date.now()}`, category: 'digital_service_center', status: TenantStatus.ACTIVE });
      const template = await ApplicationTemplate.findOne({ slug: 'digital-service-center' });
      const appA = await Application.create({
        accountId: new mongoose.Types.ObjectId(),
        templateId: template!._id,
        templateVersion: 1,
        tenantId: tenantA._id,
        name: 'App A Center',
        slug: `appa-${Date.now()}`,
        status: ApplicationStatus.ACTIVE,
      });

      await ApplicationDomain.create({
        applicationId: appA._id,
        hostname: activeCustomHost,
        type: DomainType.CUSTOM,
        status: DomainStatus.ACTIVE,
      });

      // User belonging to Tenant B attempts to call API on Tenant A's custom domain
      const tenantB = await Tenant.create({ name: 'Tenant B', slug: `tenant-b-${Date.now()}`, category: 'digital_service_center', status: TenantStatus.ACTIVE });
      const userB = await User.create({
        name: 'User B Cross-Tenant',
        email: `userb-cross-${Date.now()}@example.com`,
        mobile: '9876543305',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: tenantB._id,
        isEmailVerified: true,
        isActive: true,
      });

      const tokenB = generateAccessToken({ userId: String(userB._id), role: Role.ADMIN, tokenVersion: 0 });

      const res = await supertest(app)
        .get('/api/v1/services')
        .set('Host', activeCustomHost)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/mismatch/i);
    });
  });

  describe('5. Primary Domain Switching & Domain Lifecycle Operations', () => {
    it('should set an active custom domain as the primary domain and demote previous primary', async () => {
      const user = await User.create({
        name: 'Primary Switch User',
        email: `primary-st5-${Date.now()}@example.com`,
        mobile: '9876543306',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({ ownerUserId: user._id, name: 'Primary Account', status: AccountStatus.ACTIVE });
      const prov = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'Primary Switch Center',
        slug: `primary-st5-${Date.now()}`,
        templateSlug: 'digital-service-center',
      });

      const customHost = `www.customprimary-${Date.now()}.in`;
      const customDom = await ApplicationDomain.create({
        applicationId: prov.application._id,
        hostname: customHost,
        type: DomainType.CUSTOM,
        status: DomainStatus.ACTIVE,
        isPrimary: false,
      });

      const token = generateAccessToken({ userId: String(user._id), role: Role.ADMIN, tokenVersion: 0 });

      // Set custom domain as primary
      const res = await supertest(app)
        .post(`/api/v1/platform/applications/${prov.application._id}/domains/${customDom._id}/set-primary`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isPrimary).toBe(true);

      const defaultDom = await ApplicationDomain.findOne({ applicationId: prov.application._id, type: DomainType.DEFAULT });
      expect(defaultDom?.isPrimary).toBe(false);

      const resolvedPrimary = await DomainResolverService.getPrimaryDomain(prov.application._id);
      expect(resolvedPrimary).toBe(customHost);
    });

    it('should reject deleting the default UseSetu platform domain', async () => {
      const user = await User.findOne({ email: { $regex: /^primary-st5/ } }).setOptions({ bypassTenantQuery: true });
      const appDoc = await Application.findOne({ slug: { $regex: /^primary-st5/ } });
      const token = generateAccessToken({ userId: String(user!._id), role: Role.ADMIN, tokenVersion: 0 });

      const defaultDom = await ApplicationDomain.findOne({ applicationId: appDoc!._id, type: DomainType.DEFAULT });

      const res = await supertest(app)
        .delete(`/api/v1/platform/applications/${defaultDom!.applicationId}/domains/${defaultDom!._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be deleted/i);
    });

    it('should soft-disable a custom domain and restore default domain as primary if needed', async () => {
      const user = await User.findOne({ email: { $regex: /^primary-st5/ } }).setOptions({ bypassTenantQuery: true });
      const token = generateAccessToken({ userId: String(user!._id), role: Role.ADMIN, tokenVersion: 0 });

      const customDom = await ApplicationDomain.findOne({
        hostname: { $regex: /^www\.customprimary/ },
      });

      const res = await supertest(app)
        .delete(`/api/v1/platform/applications/${customDom!.applicationId}/domains/${customDom!._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const updatedCustom = await ApplicationDomain.findById(customDom!._id);
      expect(updatedCustom?.status).toBe(DomainStatus.DISABLED);
      expect(updatedCustom?.isPrimary).toBe(false);

      const defaultDom = await ApplicationDomain.findOne({ applicationId: customDom!.applicationId, type: DomainType.DEFAULT });
      expect(defaultDom?.isPrimary).toBe(true);
    });
  });

  describe('6. Public SEO, Sitemap, and Robots.txt Generation', () => {
    it('should generate dynamic sitemap XML and robots.txt scoped to the primary domain', async () => {
      const user = await User.create({
        name: 'SEO User St5',
        email: `seo-st5-${Date.now()}@example.com`,
        mobile: '9876543307',
        password: 'Password123!',
        role: Role.ADMIN,
        tenantId: new mongoose.Types.ObjectId(),
        isEmailVerified: true,
        isActive: true,
      });

      const account = await Account.create({ ownerUserId: user._id, name: 'SEO Account', status: AccountStatus.ACTIVE });
      const prov = await ApplicationProvisioningService.provisionApplication({
        accountId: String(account._id),
        ownerId: String(user._id),
        name: 'SEO Seva Kendra',
        slug: `seo-st5-${Date.now()}`,
        templateSlug: 'digital-service-center',
      });

      const seoCustomHost = `www.seocenter-${Date.now()}.in`;
      await ApplicationDomain.updateMany({ applicationId: prov.application._id }, { $set: { isPrimary: false } });
      await ApplicationDomain.create({
        applicationId: prov.application._id,
        hostname: seoCustomHost,
        type: DomainType.CUSTOM,
        status: DomainStatus.ACTIVE,
        isPrimary: true,
      });

      // 1. Check sitemap
      const sitemapRes = await supertest(app)
        .get('/sitemap.xml')
        .set('Host', seoCustomHost);

      expect(sitemapRes.status).toBe(200);
      expect(sitemapRes.header['content-type']).toMatch(/xml/);
      expect(sitemapRes.text).toContain(`https://${seoCustomHost}`);

      // 2. Check robots.txt
      const robotsRes = await supertest(app)
        .get('/robots.txt')
        .set('Host', seoCustomHost);

      expect(robotsRes.status).toBe(200);
      expect(robotsRes.header['content-type']).toMatch(/text\/plain/);
      expect(robotsRes.text).toContain(`Sitemap: https://${seoCustomHost}/sitemap.xml`);

      // 3. Check public context contains canonicalUrl
      const contextRes = await supertest(app)
        .get('/api/v1/public/application/context')
        .set('Host', seoCustomHost);

      expect(contextRes.status).toBe(200);
      expect(contextRes.body.data.domain.canonicalUrl).toBe(`https://${seoCustomHost}`);
      expect(contextRes.body.data.domain.primaryDomain).toBe(seoCustomHost);
    });

    it('should generate primary application tracking URLs correctly', async () => {
      const customHost = `www.urlservice-${Date.now()}.in`;
      const appId = new mongoose.Types.ObjectId();

      await ApplicationDomain.create({
        applicationId: appId,
        hostname: customHost,
        type: DomainType.CUSTOM,
        status: DomainStatus.ACTIVE,
        isPrimary: true,
      });

      const trackingUrl = await ApplicationUrlService.getRequestTrackingUrl(appId, 'CSC2026-0001');
      expect(trackingUrl).toBe(`https://${customHost}/track/CSC2026-0001`);
    });
  });
});
