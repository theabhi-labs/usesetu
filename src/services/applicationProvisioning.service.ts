import mongoose from 'mongoose';
import { Tenant, TenantStatus } from '../models/tenant.model';
import { Application, ApplicationStatus } from '../models/application.model';
import { ApplicationTemplate, TemplateStatus } from '../models/applicationTemplate.model';
import { ApplicationDomain, DomainStatus, DomainType } from '../models/applicationDomain.model';
import { WebsiteSetting } from '../models/websiteSetting.model';
import { Subscription } from '../models/subscription.model';
import { UsageRecord } from '../models/usageRecord.model';
import { SubscriptionAuditLog } from '../models/subscriptionAuditLog.model';
import { isReservedSlug } from '../utils/reservedSlugs';
import { DomainResolverService } from './domainResolver.service';
import { getTemplateInitializer } from './templateInitializers';
import { SubscriptionService } from './subscription.service';
import { EntitlementService } from './entitlement.service';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';

// In-memory idempotency cache for in-flight/recent provisioning requests (15-min TTL)
const idempotencyMap = new Map<string, { result: any; timestamp: number }>();

export class ApplicationProvisioningService {
  /**
   * Validates slug format, length, and reservation status.
   */
  static validateSlug(slug: string): string {
    if (!slug) {
      throw ApiError.badRequest('Slug is required');
    }
    const cleanSlug = slug.toLowerCase().trim();
    if (cleanSlug.length < 3) {
      throw ApiError.badRequest('Slug must be at least 3 characters long');
    }
    if (cleanSlug.length > 63) {
      throw ApiError.badRequest('Slug cannot exceed 63 characters');
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(cleanSlug)) {
      throw ApiError.badRequest(
        'Slug must contain only lowercase letters, numbers, and single hyphens between words (no trailing/leading hyphens)',
      );
    }
    if (isReservedSlug(cleanSlug)) {
      throw ApiError.badRequest(`The slug "${cleanSlug}" is a reserved system word`);
    }
    return cleanSlug;
  }

  /**
   * Checks whether a slug is available for application creation.
   */
  static async checkSlugAvailability(slug: string): Promise<{ available: boolean; slug: string; reason?: string }> {
    try {
      const cleanSlug = this.validateSlug(slug);

      const existingApp = await Application.findOne({ slug: cleanSlug });
      if (existingApp) {
        return { available: false, slug: cleanSlug, reason: 'Slug is already in use by another application' };
      }

      const defaultHostname = DomainResolverService.generateDefaultHostname(cleanSlug);
      const existingDomain = await ApplicationDomain.findOne({ hostname: defaultHostname });
      if (existingDomain) {
        return { available: false, slug: cleanSlug, reason: 'Default domain for this slug is already claimed' };
      }

      return { available: true, slug: cleanSlug };
    } catch (err: any) {
      return { available: false, slug, reason: err.message || 'Invalid slug' };
    }
  }

  /**
   * Safe, idempotent application provisioning pipeline.
   */
  static async provisionApplication(params: {
    accountId: string;
    ownerId: string;
    name: string;
    slug: string;
    templateSlug: string;
    idempotencyKey?: string;
  }) {
    const startTime = Date.now();
    const { accountId, ownerId, name, slug, templateSlug, idempotencyKey } = params;

    // 0. Check Idempotency Cache if key provided
    if (idempotencyKey) {
      const cacheKey = `${accountId}:${idempotencyKey}`;
      const cached = idempotencyMap.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
        logger.info(`Returning cached result for idempotency key: ${idempotencyKey}`);
        return cached.result;
      }
    }

    if (!name || name.trim().length === 0) {
      throw ApiError.badRequest('Application name is required');
    }

    // 1. Slug validation
    const cleanSlug = this.validateSlug(slug);

    // Check duplicate slug in applications and domains
    const existingApp = await Application.findOne({ slug: cleanSlug });
    if (existingApp) {
      throw ApiError.badRequest(`Application with slug "${cleanSlug}" already exists`);
    }

    const defaultHostname = DomainResolverService.generateDefaultHostname(cleanSlug);
    const existingDomain = await ApplicationDomain.findOne({ hostname: defaultHostname });
    if (existingDomain) {
      throw ApiError.badRequest(`Hostname "${defaultHostname}" is already taken`);
    }

    // 2. Fetch template
    const template = await ApplicationTemplate.findOne({ slug: templateSlug, status: TemplateStatus.ACTIVE });
    if (!template) {
      throw ApiError.notFound(`Application template "${templateSlug}" not found or inactive`);
    }

    let createdTenant: any = null;
    let createdApp: any = null;
    let createdDomain: any = null;
    let createdSubscription: any = null;

    try {
      // 3. Create Tenant in PROVISIONING state
      createdTenant = await Tenant.create({
        name: name.trim(),
        slug: cleanSlug,
        status: TenantStatus.PROVISIONING,
        category: template.category,
        ownerId: new mongoose.Types.ObjectId(ownerId),
        accountId: new mongoose.Types.ObjectId(accountId),
      });

      // 4. Create Application in PROVISIONING state
      createdApp = await Application.create({
        tenantId: createdTenant._id,
        accountId: new mongoose.Types.ObjectId(accountId),
        templateId: template._id,
        templateVersion: template.version,
        name: name.trim(),
        slug: cleanSlug,
        status: ApplicationStatus.PROVISIONING,
      });

      // 5. Create Default Application Domain
      createdDomain = await ApplicationDomain.create({
        applicationId: createdApp._id,
        hostname: defaultHostname,
        type: DomainType.DEFAULT,
        status: DomainStatus.ACTIVE,
        isPrimary: true,
      });

      // 6. Initialize Template Defaults (e.g. WebsiteSettings)
      const initializer = getTemplateInitializer(template.slug);
      await initializer.initialize({
        tenantId: String(createdTenant._id),
        applicationId: String(createdApp._id),
        name: name.trim(),
        slug: cleanSlug,
      });

      // 7. Assign Default Free Subscription
      createdSubscription = await SubscriptionService.createSubscription({
        applicationId: createdApp._id,
        planSlug: 'free',
        reason: 'Initial application provisioning',
      });

      // 8. Initialize / Sync baseline usage records
      await EntitlementService.syncActiveUsersUsage(createdApp._id, createdTenant._id);
      await EntitlementService.syncStorageUsage(createdApp._id, createdTenant._id);

      // 9. Activate Tenant and Application
      createdTenant.status = TenantStatus.ACTIVE;
      await createdTenant.save();

      createdApp.status = ApplicationStatus.ACTIVE;
      await createdApp.save();

      const durationMs = Date.now() - startTime;
      logger.info('Application provisioned successfully', {
        applicationId: createdApp._id,
        tenantId: createdTenant._id,
        templateId: template._id,
        slug: cleanSlug,
        durationMs,
      });

      const response = {
        application: createdApp,
        tenant: createdTenant,
        domain: createdDomain,
        subscription: createdSubscription,
      };

      // Store in idempotency cache
      if (idempotencyKey) {
        idempotencyMap.set(`${accountId}:${idempotencyKey}`, {
          result: response,
          timestamp: Date.now(),
        });
      }

      return response;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      logger.error('Provisioning failed. Cleaning up created records...', {
        error: err.message,
        slug: cleanSlug,
        durationMs,
      });

      // Compensating Rollback
      if (createdDomain) {
        await ApplicationDomain.deleteOne({ _id: createdDomain._id });
      }
      if (createdApp) {
        await Subscription.deleteMany({ applicationId: createdApp._id });
        await UsageRecord.deleteMany({ applicationId: createdApp._id });
        await SubscriptionAuditLog.deleteMany({ applicationId: createdApp._id });
        await Application.deleteOne({ _id: createdApp._id });
      }
      if (createdTenant) {
        await WebsiteSetting.deleteOne({ _id: String(createdTenant._id) }).setOptions({ bypassTenantQuery: true });
        await Tenant.deleteOne({ _id: createdTenant._id });
      }

      throw err;
    }
  }
}
