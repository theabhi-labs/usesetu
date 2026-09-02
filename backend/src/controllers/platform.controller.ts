import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { ApplicationTemplate } from '../models/applicationTemplate.model';
import { Application, ApplicationStatus } from '../models/application.model';
import { Account, AccountStatus } from '../models/account.model';
import { Tenant, TenantStatus } from '../models/tenant.model';
import { User } from '../models/user.model';
import { WebsiteSetting } from '../models/websiteSetting.model';
import { ApplicationDomain, DomainType, DomainStatus, SslStatus, VerificationMethod } from '../models/applicationDomain.model';
import { Plan, PlanStatus } from '../models/plan.model';
import { SubscriptionStatus, BillingCycle } from '../models/subscription.model';
import { SubscriptionAuditLog } from '../models/subscriptionAuditLog.model';
import { PlatformNotification, PlatformNotificationCategory, PlatformNotificationType } from '../models/platformNotification.model';
import { PaymentTransaction } from '../models/paymentTransaction.model';
import { BillingInvoice } from '../models/billingInvoice.model';
import { ApplicationProvisioningService } from '../services/applicationProvisioning.service';
import { DomainResolverService } from '../services/domainResolver.service';
import { DomainNormalizationService } from '../services/domainNormalization.service';
import { DnsVerificationService } from '../services/dnsVerification.service';
import { DomainProvisioningService } from '../services/domainProvisioning.service';
import { SubscriptionService } from '../services/subscription.service';
import { EntitlementService } from '../services/entitlement.service';
import { PaymentService } from '../services/payment/payment.service';
import { PaymentReconciliationService } from '../services/payment/paymentReconciliation.service';
import { BillingLifecycleService } from '../services/billingLifecycle.service';
import { env } from '../config/env';

// ---------------------------------------------------------------------------
// Helper: Verify application ownership by user's account
// ---------------------------------------------------------------------------
export const verifyAppOwnership = async (userId: string, applicationId: string) => {
  const app = await Application.findById(applicationId);
  if (!app) throw ApiError.notFound('Application not found');

  const account = await Account.findOne({ ownerUserId: userId as any });
  if (!account || String(app.accountId) !== String(account._id)) {
    throw ApiError.forbidden('You are not authorized to access this application');
  }

  return { app, account };
};

// ---------------------------------------------------------------------------
// GET /api/v1/platform/templates
// ---------------------------------------------------------------------------
export const getTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await ApplicationTemplate.find({ status: 'active' })
    .select('name slug category description version')
    .lean();

  res.status(200).json(new ApiResponse(200, templates, 'Templates retrieved successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/plans
// ---------------------------------------------------------------------------
export const getPlans = asyncHandler(async (_req: Request, res: Response) => {
  const plans = await Plan.find({ status: PlanStatus.ACTIVE })
    .sort({ 'pricing.monthly': 1 })
    .lean();

  res.status(200).json(new ApiResponse(200, plans, 'Plans retrieved successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/slug/:slug/availability (or ?slug=...)
// ---------------------------------------------------------------------------
export const checkSlugAvailability = asyncHandler(async (req: Request, res: Response) => {
  const slug = (req.params.slug || req.query.slug) as string;
  if (!slug) {
    throw ApiError.badRequest('Slug is required');
  }

  const result = await ApplicationProvisioningService.checkSlugAvailability(slug);
  res.status(200).json(new ApiResponse(200, result, 'Slug availability checked'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/dashboard
// ---------------------------------------------------------------------------
export const getPlatformDashboard = asyncHandler(async (req: Request, res: Response) => {
  let account = await Account.findOne({ ownerUserId: req.user!.userId });
  if (!account) {
    account = await Account.create({
      ownerUserId: req.user!.userId as any,
      name: `${req.user!.userId}'s Account`,
      status: AccountStatus.ACTIVE,
    });
  }

  const applications = await Application.find({ accountId: account._id })
    .populate('templateId', 'name slug category description')
    .sort({ createdAt: -1 })
    .lean();

  let totalStorageUsed = 0;
  let totalActiveUsers = 0;
  let activeApplications = 0;
  let attentionApplications = 0;
  const subscriptionBreakdown: Record<string, number> = { free: 0, starter: 0, professional: 0, business: 0 };

  const enrichedApps = await Promise.all(
    applications.map(async (app: any) => {
      const primaryDomain = await DomainResolverService.getPrimaryDomain(app._id);
      const subscription = await SubscriptionService.getCurrentSubscription(app._id);
      const storageUsage = await EntitlementService.getUsage(app._id, 'storage_bytes');
      const storageLimit = await EntitlementService.getLimit(app._id, 'storage_bytes');
      const usersUsage = await EntitlementService.getUsage(app._id, 'active_users');
      const usersLimit = await EntitlementService.getLimit(app._id, 'active_users');

      totalStorageUsed += storageUsage || 0;
      totalActiveUsers += usersUsage || 0;

      if (app.status === ApplicationStatus.ACTIVE) {
        activeApplications++;
      }

      const planSlug = subscription?.planSnapshot?.slug || 'free';
      subscriptionBreakdown[planSlug] = (subscriptionBreakdown[planSlug] || 0) + 1;

      // Check if application requires attention (suspended, expired, failed, or over 80% quota)
      const isOverStorageQuota =
        typeof storageLimit === 'number' && storageLimit > 0 && storageUsage / storageLimit >= 0.8;
      const isOverUsersQuota =
        typeof usersLimit === 'number' && usersLimit > 0 && usersUsage / usersLimit >= 0.8;
      const requiresAttention =
        app.status === ApplicationStatus.SUSPENDED ||
        app.status === ApplicationStatus.EXPIRED ||
        app.status === ApplicationStatus.FAILED ||
        isOverStorageQuota ||
        isOverUsersQuota;

      if (requiresAttention) {
        attentionApplications++;
      }

      return {
        id: app._id,
        name: app.name,
        slug: app.slug,
        status: app.status,
        template: app.templateId
          ? {
              name: app.templateId.name,
              slug: app.templateId.slug,
              category: app.templateId.category,
            }
          : null,
        defaultDomain: primaryDomain || DomainResolverService.generateDefaultHostname(app.slug),
        subscription: subscription
          ? {
              plan: subscription.planSnapshot?.name || 'Free',
              planSlug: subscription.planSnapshot?.slug || 'free',
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              endsAt: subscription.endsAt,
              trialEndsAt: subscription.trialEndsAt,
            }
          : {
              plan: 'Free',
              planSlug: 'free',
              status: 'active',
            },
        usage: {
          storage: { used: storageUsage, limit: storageLimit },
          activeUsers: { used: usersUsage, limit: usersLimit },
        },
        requiresAttention,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      };
    }),
  );

  // Recent activity from SubscriptionAuditLog
  const recentLogs = await SubscriptionAuditLog.find({ accountId: account._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const dashboardData = {
    account: {
      id: account._id,
      name: account.name,
      status: account.status,
    },
    metrics: {
      totalApplications: applications.length,
      activeApplications,
      attentionApplications,
      totalStorageUsed,
      totalActiveUsers,
      subscriptionBreakdown,
    },
    applications: enrichedApps,
    recentActivity: recentLogs.map((log: any) => ({
      id: log._id,
      applicationId: log.applicationId,
      action: log.action,
      oldPlan: log.oldPlan?.name,
      newPlan: log.newPlan?.name,
      reason: log.reason,
      createdAt: log.createdAt,
    })),
  };

  res.status(200).json(new ApiResponse(200, dashboardData, 'Platform dashboard retrieved successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/billing
// ---------------------------------------------------------------------------
export const getPlatformBilling = asyncHandler(async (req: Request, res: Response) => {
  let account = await Account.findOne({ ownerUserId: req.user!.userId });
  if (!account) {
    account = await Account.create({
      ownerUserId: req.user!.userId as any,
      name: `${req.user!.userId}'s Account`,
      status: AccountStatus.ACTIVE,
    });
  }

  const applications = await Application.find({ accountId: account._id })
    .sort({ createdAt: -1 })
    .lean();

  const plans = await Plan.find({ status: PlanStatus.ACTIVE })
    .sort({ 'pricing.monthly': 1 })
    .lean();

  const activeSubscriptions = await Promise.all(
    applications.map(async (app: any) => {
      const subscription = await SubscriptionService.getCurrentSubscription(app._id);
      const primaryDomain = await DomainResolverService.getPrimaryDomain(app._id);

      return {
        applicationId: app._id,
        applicationName: app.name,
        slug: app.slug,
        primaryDomain: primaryDomain || DomainResolverService.generateDefaultHostname(app.slug),
        status: app.status,
        subscription: subscription
          ? {
              id: subscription._id,
              plan: subscription.planSnapshot?.name || 'Free',
              planSlug: subscription.planSnapshot?.slug || 'free',
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              startsAt: subscription.startsAt,
              endsAt: subscription.endsAt,
              trialEndsAt: subscription.trialEndsAt,
              cancelledAt: subscription.cancelledAt,
              pricing: subscription.planId?.pricing || { monthly: 0, yearly: 0, currency: 'INR' },
            }
          : {
              plan: 'Free',
              planSlug: 'free',
              status: 'active',
              billingCycle: 'monthly',
              pricing: { monthly: 0, yearly: 0, currency: 'INR' },
            },
      };
    }),
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        account: {
          id: account._id,
          name: account.name,
          status: account.status,
        },
        subscriptions: activeSubscriptions,
        availablePlans: plans,
        transactions: [], // Stage 6 empty state for future gateway transactions
        gatewayNotice: 'Payment gateway integration (Stripe / Razorpay) will be enabled in Stage 7.',
      },
      'Billing overview retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications
// ---------------------------------------------------------------------------
export const getApplications = asyncHandler(async (req: Request, res: Response) => {
  let account = await Account.findOne({ ownerUserId: req.user!.userId });
  if (!account) {
    account = await Account.create({
      ownerUserId: req.user!.userId as any,
      name: `${req.user!.userId}'s Account`,
      status: AccountStatus.ACTIVE,
    });
  }

  const { search, status } = req.query;
  const filter: any = { accountId: account._id };
  if (status && typeof status === 'string' && status !== 'all') {
    filter.status = status;
  }
  if (search && typeof search === 'string' && search.trim().length > 0) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: searchRegex }, { slug: searchRegex }];
  }

  const applications = await Application.find(filter)
    .populate('templateId', 'name slug category description')
    .sort({ createdAt: -1 })
    .lean();

  // Populate primary domain and subscription summaries for dashboard view
  const enrichedApps = await Promise.all(
    applications.map(async (app: any) => {
      const primaryDomain = await DomainResolverService.getPrimaryDomain(app._id);
      const subscription = await SubscriptionService.getCurrentSubscription(app._id);

      return {
        id: app._id,
        name: app.name,
        slug: app.slug,
        status: app.status,
        template: app.templateId
          ? {
              name: app.templateId.name,
              slug: app.templateId.slug,
              category: app.templateId.category,
            }
          : null,
        defaultDomain: primaryDomain || DomainResolverService.generateDefaultHostname(app.slug),
        subscription: subscription
          ? {
              plan: subscription.planSnapshot?.name || 'Free',
              planSlug: subscription.planSnapshot?.slug || 'free',
              status: subscription.status,
            }
          : {
              plan: 'Free',
              planSlug: 'free',
              status: 'active',
            },
        createdAt: app.createdAt,
      };
    }),
  );

  res.status(200).json(new ApiResponse(200, enrichedApps, 'Applications retrieved successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/:id
// ---------------------------------------------------------------------------
export const getApplicationDetail = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const template = await ApplicationTemplate.findById(app.templateId).select('name slug category description');
  const primaryDomain = await DomainResolverService.getPrimaryDomain(app._id);
  const subscription = await SubscriptionService.getCurrentSubscription(app._id);

  const appData = {
    id: app._id,
    name: app.name,
    slug: app.slug,
    status: app.status,
    template: template
      ? {
          name: template.name,
          slug: template.slug,
          category: template.category,
          description: template.description,
        }
      : null,
    defaultDomain: primaryDomain || DomainResolverService.generateDefaultHostname(app.slug),
    subscription: subscription
      ? {
          plan: subscription.planSnapshot?.name || 'Free',
          planSlug: subscription.planSnapshot?.slug || 'free',
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          startsAt: subscription.startsAt,
          endsAt: subscription.endsAt,
          trialEndsAt: subscription.trialEndsAt,
        }
      : {
          plan: 'Free',
          planSlug: 'free',
          status: 'active',
        },
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };

  res.status(200).json(new ApiResponse(200, appData, 'Application retrieved successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications
// ---------------------------------------------------------------------------
export const createApplication = asyncHandler(async (req: Request, res: Response) => {
  let account = await Account.findOne({ ownerUserId: req.user!.userId });
  if (!account) {
    account = await Account.create({
      ownerUserId: req.user!.userId as any,
      name: `${req.user!.userId}'s Account`,
      status: AccountStatus.ACTIVE,
    });
  }

  const { name, slug, templateSlug } = req.body;
  if (!name || !slug || !templateSlug) {
    throw ApiError.badRequest('Missing name, slug, or templateSlug parameters');
  }

  const idempotencyKey = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;

  const result = await ApplicationProvisioningService.provisionApplication({
    accountId: String(account._id),
    ownerId: req.user!.userId,
    name,
    slug,
    templateSlug,
    idempotencyKey,
  });

  const responseData = {
    application: {
      id: result.application._id,
      name: result.application.name,
      slug: result.application.slug,
      status: result.application.status,
      createdAt: result.application.createdAt,
    },
    domain: {
      hostname: result.domain?.hostname || DomainResolverService.generateDefaultHostname(result.application.slug),
      type: result.domain?.type || 'default',
    },
    subscription: {
      plan: result.subscription?.planSnapshot?.name || 'Free',
      status: result.subscription?.status || 'active',
    },
  };

  res.status(201).json(new ApiResponse(201, responseData, 'Application provisioned successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/:id/domain & /domains (List all domains)
// ---------------------------------------------------------------------------
export const getApplicationDomain = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const domains = await ApplicationDomain.find({
    applicationId: app._id,
    status: { $ne: DomainStatus.DISABLED },
  }).sort({ isPrimary: -1, type: 1, createdAt: 1 });

  const primaryHostname = await DomainResolverService.getPrimaryDomain(app._id);
  const canCustomDomain = await EntitlementService.can(app._id, 'customDomain');
  const customDomainLimit = await EntitlementService.getLimit(app._id, 'customDomain');

  const customDomainCount = domains.filter((d) => d.type === DomainType.CUSTOM).length;
  const numLimit = typeof customDomainLimit === 'number' ? customDomainLimit : canCustomDomain ? 1 : 0;

  const enrichedDomains = domains.map((domain) => {
    const instructions =
      domain.type === DomainType.CUSTOM
        ? DnsVerificationService.getVerificationInstructions(domain)
        : null;

    return {
      id: domain._id,
      hostname: domain.hostname,
      type: domain.type,
      status: domain.status,
      isPrimary: domain.isPrimary,
      verificationMethod: domain.verificationMethod,
      sslStatus: domain.sslStatus,
      sslProvider: domain.sslProvider,
      verificationError: domain.verificationError,
      lastVerificationAt: domain.lastVerificationAt,
      verifiedAt: domain.verifiedAt,
      activatedAt: domain.activatedAt,
      instructions,
      createdAt: domain.createdAt,
    };
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        defaultDomain: DomainResolverService.generateDefaultHostname(app.slug),
        primaryDomain: primaryHostname || DomainResolverService.generateDefaultHostname(app.slug),
        domains: enrichedDomains,
        entitlement: {
          enabled: canCustomDomain,
          limit: numLimit,
          used: customDomainCount,
          remaining: Math.max(0, numLimit - customDomainCount),
        },
        customDomainsEnabled: canCustomDomain,
      },
      'Domain configuration retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/domains (Add Custom Domain)
// ---------------------------------------------------------------------------
export const addCustomDomain = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const { hostname, verificationMethod } = req.body;
  if (!hostname) {
    throw ApiError.badRequest('Domain hostname is required');
  }

  // 1. Check Plan Entitlement
  await EntitlementService.assertAllowed(app._id, 'customDomain');

  // 2. Validate Domain Format & RFC compliance
  const validation = DomainNormalizationService.validateCustomDomain(hostname);
  if (!validation.valid) {
    throw ApiError.badRequest(validation.reason || 'Invalid custom domain name');
  }

  // 3. Enforce Domain Quantity Limit
  const customDomainLimit = await EntitlementService.getLimit(app._id, 'customDomain');
  const numLimit = typeof customDomainLimit === 'number' ? customDomainLimit : 1;

  const currentCustomCount = await ApplicationDomain.countDocuments({
    applicationId: app._id,
    type: DomainType.CUSTOM,
    status: { $ne: DomainStatus.DISABLED },
  });

  if (currentCustomCount >= numLimit) {
    throw ApiError.forbidden(
      `Custom domain limit reached (${currentCustomCount}/${numLimit}). Please upgrade your plan to connect more domains.`,
    );
  }

  // 4. Check Global Domain Uniqueness
  const existingDomain = await ApplicationDomain.findOne({ hostname: validation.hostname });
  if (existingDomain) {
    if (String(existingDomain.applicationId) === String(app._id)) {
      if (existingDomain.status === DomainStatus.DISABLED) {
        existingDomain.status = DomainStatus.PENDING;
        existingDomain.disabledAt = undefined;
        existingDomain.disabledBy = undefined;
        existingDomain.disabledReason = undefined;
        await existingDomain.save();
      }

      const instructions = DnsVerificationService.getVerificationInstructions(existingDomain);
      res.status(200).json(
        new ApiResponse(
          200,
          {
            domain: {
              id: existingDomain._id,
              hostname: existingDomain.hostname,
              type: existingDomain.type,
              status: existingDomain.status,
              sslStatus: existingDomain.sslStatus,
              isPrimary: existingDomain.isPrimary,
            },
            verification: instructions,
          },
          'Domain already added to this application',
        ),
      );
      return;
    }

    throw ApiError.conflict('This domain is already claimed by another application.');
  }

  // 5. Generate Secure Verification Token
  const token = `usesetu-verify-${crypto.randomBytes(16).toString('hex')}`;
  const method = verificationMethod === 'txt' ? VerificationMethod.TXT : VerificationMethod.CNAME;

  // 6. Create ApplicationDomain Record
  const newDomain = await ApplicationDomain.create({
    applicationId: app._id,
    hostname: validation.hostname,
    type: DomainType.CUSTOM,
    status: DomainStatus.PENDING,
    sslStatus: SslStatus.PENDING,
    isPrimary: false,
    verificationMethod: method,
    verificationToken: token,
    verificationExpectedValue: env.CUSTOM_DOMAIN_CNAME_TARGET || 'domains.usesetu.com',
    verificationAttempts: 0,
  });

  const instructions = DnsVerificationService.getVerificationInstructions(newDomain);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        domain: {
          id: newDomain._id,
          hostname: newDomain.hostname,
          type: newDomain.type,
          status: newDomain.status,
          sslStatus: newDomain.sslStatus,
          isPrimary: newDomain.isPrimary,
        },
        verification: instructions,
      },
      'Custom domain added successfully. Please configure your DNS records.',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/domains/:domainId/verify (Manual DNS Verify)
// ---------------------------------------------------------------------------
export const verifyApplicationDomain = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const domain = await ApplicationDomain.findOne({
    _id: req.params.domainId,
    applicationId: app._id,
  });

  if (!domain) {
    throw ApiError.notFound('Domain not found for this application');
  }

  const { domain: updatedDomain, checkResult } = await DnsVerificationService.verifyDomain(domain._id);

  const responseData = {
    domain: {
      id: updatedDomain._id,
      hostname: updatedDomain.hostname,
      status: updatedDomain.status,
      sslStatus: updatedDomain.sslStatus,
      isPrimary: updatedDomain.isPrimary,
      verifiedAt: updatedDomain.verifiedAt,
      activatedAt: updatedDomain.activatedAt,
      verificationError: updatedDomain.verificationError,
      lastVerificationAt: updatedDomain.lastVerificationAt,
    },
    verification: checkResult,
  };

  if (checkResult.verified) {
    res.status(200).json(new ApiResponse(200, responseData, 'Domain verified successfully and activated'));
  } else {
    res.status(200).json(
      new ApiResponse(
        200,
        responseData,
        checkResult.reason || 'DNS verification failed. Please ensure DNS records are propagated.',
      ),
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/domains/:domainId/set-primary
// ---------------------------------------------------------------------------
export const setPrimaryDomain = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const domain = await ApplicationDomain.findOne({
    _id: req.params.domainId,
    applicationId: app._id,
  });

  if (!domain) {
    throw ApiError.notFound('Domain not found for this application');
  }

  if (domain.status !== DomainStatus.ACTIVE) {
    throw ApiError.badRequest('Only active, verified domains can be set as the primary domain.');
  }

  // Demote previous primary domain and promote selected domain
  await ApplicationDomain.updateMany({ applicationId: app._id }, { $set: { isPrimary: false } });

  domain.isPrimary = true;
  await domain.save();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        id: domain._id,
        hostname: domain.hostname,
        isPrimary: domain.isPrimary,
        status: domain.status,
      },
      'Primary domain updated successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/platform/applications/:id/domains/:domainId (Delete/Disable Domain)
// ---------------------------------------------------------------------------
export const deleteApplicationDomain = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const domain = await ApplicationDomain.findOne({
    _id: req.params.domainId,
    applicationId: app._id,
  });

  if (!domain) {
    throw ApiError.notFound('Domain not found for this application');
  }

  if (domain.type === DomainType.DEFAULT) {
    throw ApiError.badRequest('The default UseSetu platform domain cannot be deleted.');
  }

  // If this domain was primary, automatically restore the default domain as primary
  if (domain.isPrimary) {
    await ApplicationDomain.findOneAndUpdate(
      { applicationId: app._id, type: DomainType.DEFAULT },
      { $set: { isPrimary: true, status: DomainStatus.ACTIVE } },
    );
  }

  // Soft-disable domain
  domain.status = DomainStatus.DISABLED;
  domain.isPrimary = false;
  domain.disabledAt = new Date();
  domain.disabledBy = req.user!.userId as any;
  domain.disabledReason = (req.body?.reason as string) || 'Removed by account owner';
  await domain.save();

  // Deactivate edge routing
  await DomainProvisioningService.deactivateDomain(domain.hostname);

  res.status(200).json(new ApiResponse(200, { id: domain._id, hostname: domain.hostname }, 'Domain removed successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/:id/domains/:domainId/status
// ---------------------------------------------------------------------------
export const getApplicationDomainStatus = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const domain = await ApplicationDomain.findOne({
    _id: req.params.domainId,
    applicationId: app._id,
  });

  if (!domain) {
    throw ApiError.notFound('Domain not found for this application');
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        id: domain._id,
        hostname: domain.hostname,
        type: domain.type,
        status: domain.status,
        sslStatus: domain.sslStatus,
        isPrimary: domain.isPrimary,
        verificationAttempts: domain.verificationAttempts,
        lastVerificationAt: domain.lastVerificationAt,
        verifiedAt: domain.verifiedAt,
        activatedAt: domain.activatedAt,
        verificationError: domain.verificationError,
      },
      'Domain status retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/:id/subscription
// ---------------------------------------------------------------------------
export const getApplicationSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const subscription = await SubscriptionService.getCurrentSubscription(app._id);
  const effectiveEntitlements = await SubscriptionService.resolveEffectiveEntitlements(app._id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        subscription,
        effectiveEntitlements,
      },
      'Subscription retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/subscription/change-plan
// ---------------------------------------------------------------------------
export const changeApplicationPlan = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const { planId, planSlug, billingCycle, reason } = req.body;
  if (!planId && !planSlug) {
    throw ApiError.badRequest('planId or planSlug is required');
  }

  const updatedSubscription = await SubscriptionService.changePlan({
    applicationId: app._id,
    newPlanId: planId,
    newPlanSlug: planSlug,
    billingCycle,
    actorId: req.user!.userId,
    reason,
  });

  const resData = {
    ...updatedSubscription.toObject(),
    plan: updatedSubscription.planSnapshot,
  };

  res.status(200).json(new ApiResponse(200, resData, 'Plan changed successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/subscription/cancel
// ---------------------------------------------------------------------------
export const cancelApplicationSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);
  const { reason } = req.body;

  const cancelledSubscription = await SubscriptionService.cancelSubscription({
    applicationId: app._id,
    reason,
    actorId: req.user!.userId,
  });

  res.status(200).json(new ApiResponse(200, cancelledSubscription, 'Subscription cancelled successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/billing/checkout
// ---------------------------------------------------------------------------
export const createBillingCheckout = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);
  const { planId, billingCycle } = req.body;

  if (!planId) {
    throw ApiError.badRequest('planId is required');
  }

  const user = await User.findById(req.user!.userId).setOptions({ bypassTenantQuery: true });

  const checkoutData = await PaymentService.createCheckout({
    applicationId: app._id,
    planId,
    billingCycle: (billingCycle as BillingCycle) || BillingCycle.MONTHLY,
    actorId: req.user!.userId,
    customerEmail: user?.email,
    customerName: user?.name || app.name,
  });

  res.status(200).json(new ApiResponse(200, checkoutData, 'Checkout order created successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/billing/verify-payment
// ---------------------------------------------------------------------------
export const verifyBillingPayment = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw ApiError.badRequest('razorpay_order_id, razorpay_payment_id, and razorpay_signature are required');
  }

  const result = await PaymentService.verifyPayment({
    applicationId: app._id,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    razorpaySignature: razorpay_signature,
    actorId: req.user!.userId,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        success: true,
        transaction: result.transaction,
        subscription: result.subscription,
      },
      'Payment verified and subscription updated successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/:id/billing
// ---------------------------------------------------------------------------
export const getApplicationBillingSummary = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const subscription = await SubscriptionService.getCurrentSubscription(app._id);
  const effectiveEntitlements = await SubscriptionService.resolveEffectiveEntitlements(app._id);
  const recentTransactions = await PaymentTransaction.find({ applicationId: app._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const plans = await Plan.find({ status: PlanStatus.ACTIVE }).sort({ 'pricing.monthly': 1 }).lean();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        applicationId: app._id,
        applicationName: app.name,
        currentSubscription: subscription,
        effectiveEntitlements,
        recentTransactions,
        availablePlans: plans,
      },
      'Application billing summary retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/:id/billing/history
// ---------------------------------------------------------------------------
export const getBillingHistory = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const skip = (page - 1) * limit;

  const [transactions, total, invoices] = await Promise.all([
    PaymentTransaction.find({ applicationId: app._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('planId', 'name slug')
      .lean(),
    PaymentTransaction.countDocuments({ applicationId: app._id }),
    BillingInvoice.find({ applicationId: app._id }).lean(),
  ]);

  const invoiceMap = new Map(invoices.map((inv) => [String(inv.paymentTransactionId), inv]));

  const formattedTransactions = transactions.map((t: any) => ({
    id: t._id,
    orderId: t.providerOrderId,
    paymentId: t.providerPaymentId,
    amount: t.amount,
    amountMajor: t.amount / 100,
    currency: t.currency,
    status: t.status,
    method: t.method,
    description: t.description,
    billingCycle: t.billingCycle,
    plan: t.planId?.name || 'Plan',
    planSlug: t.planId?.slug || 'plan',
    paidAt: t.paidAt,
    failedAt: t.failedAt,
    refundedAt: t.refundedAt,
    failureReason: t.failureReason,
    invoiceNumber: invoiceMap.get(String(t._id))?.invoiceNumber,
    createdAt: t.createdAt,
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        transactions: formattedTransactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Billing history retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/:id/billing/payments/:paymentId
// ---------------------------------------------------------------------------
export const getPaymentDetail = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);
  const { paymentId } = req.params;

  const transaction = await PaymentTransaction.findOne({
    applicationId: app._id,
    $or: [{ providerPaymentId: paymentId }, { _id: mongoose.isValidObjectId(paymentId) ? paymentId : undefined }],
  })
    .populate('planId')
    .lean();

  if (!transaction) {
    throw ApiError.notFound('Payment transaction not found');
  }

  const invoice = await BillingInvoice.findOne({ paymentTransactionId: transaction._id }).lean();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        transaction,
        invoice,
      },
      'Payment details retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/billing/payments/:paymentId/refund
// ---------------------------------------------------------------------------
export const refundBillingPayment = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);
  const { paymentId } = req.params;
  const { amount, reason } = req.body;

  const updatedTransaction = await PaymentService.refundPayment({
    applicationId: app._id,
    paymentId,
    amount: typeof amount === 'number' ? amount : undefined,
    reason,
    actorId: req.user!.userId,
  });

  res.status(200).json(new ApiResponse(200, updatedTransaction, 'Refund initiated successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/billing/retry
// ---------------------------------------------------------------------------
export const retryBillingPayment = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);
  const { planId, billingCycle } = req.body;

  const user = await User.findById(req.user!.userId).setOptions({ bypassTenantQuery: true });

  const checkoutData = await PaymentService.createCheckout({
    applicationId: app._id,
    planId,
    billingCycle: (billingCycle as BillingCycle) || BillingCycle.MONTHLY,
    actorId: req.user!.userId,
    customerEmail: user?.email,
    customerName: user?.name || app.name,
  });

  res.status(200).json(new ApiResponse(200, checkoutData, 'Payment retry checkout created successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/billing/reconcile
// ---------------------------------------------------------------------------
export const reconcileApplicationBilling = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const reports = await PaymentReconciliationService.reconcileApplicationBilling(app._id);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        applicationId: app._id,
        reconciliationReports: reports,
        syncedCount: reports.filter((r) => r.synced).length,
      },
      'Application billing reconciled successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/:id/billing/audits
// ---------------------------------------------------------------------------
export const getApplicationBillingAudits = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 15;
  const skip = (page - 1) * limit;

  const [audits, total] = await Promise.all([
    SubscriptionAuditLog.find({ applicationId: app._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actorId', 'name email')
      .lean(),
    SubscriptionAuditLog.countDocuments({ applicationId: app._id }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        audits,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      'Billing audit logs retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/billing/sync-lifecycle
// ---------------------------------------------------------------------------
export const runBillingLifecycleManual = asyncHandler(async (req: Request, res: Response) => {
  await verifyAppOwnership(req.user!.userId, req.params.id);

  const report = await BillingLifecycleService.runAutomatedLifecycleCycle();

  res.status(200).json(new ApiResponse(200, report, 'Billing lifecycle cycle executed successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/:id/usage
// ---------------------------------------------------------------------------
export const getApplicationUsage = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const [
    activeUsersUsed,
    activeUsersLimit,
    storageUsed,
    storageLimit,
    messagesUsed,
    messagesLimit,
    requestsUsed,
    requestsLimit,
    appointmentsUsed,
    appointmentsLimit,
    canCustomDomain,
    canWhatsapp,
    canEmail,
    canExportReports,
    canCustomBranding,
  ] = await Promise.all([
    EntitlementService.getUsage(app._id, 'active_users'),
    EntitlementService.getLimit(app._id, 'active_users'),
    EntitlementService.getUsage(app._id, 'storage_bytes'),
    EntitlementService.getLimit(app._id, 'storage_bytes'),
    EntitlementService.getUsage(app._id, 'monthlyMessages'),
    EntitlementService.getLimit(app._id, 'monthlyMessages'),
    EntitlementService.getUsage(app._id, 'requests'),
    EntitlementService.getLimit(app._id, 'requests'),
    EntitlementService.getUsage(app._id, 'appointments'),
    EntitlementService.getLimit(app._id, 'appointments'),
    EntitlementService.can(app._id, 'customDomain'),
    EntitlementService.can(app._id, 'whatsapp'),
    EntitlementService.can(app._id, 'email'),
    EntitlementService.can(app._id, 'exportReports'),
    EntitlementService.can(app._id, 'customBranding'),
  ]);

  const responseData = {
    applicationId: app._id,
    metrics: {
      activeUsers: {
        used: activeUsersUsed,
        limit: activeUsersLimit,
        remaining: typeof activeUsersLimit === 'number' ? Math.max(0, activeUsersLimit - activeUsersUsed) : null,
        unit: 'seats',
      },
      storage: {
        used: storageUsed,
        limit: storageLimit,
        remaining: typeof storageLimit === 'number' ? Math.max(0, storageLimit - storageUsed) : null,
        unit: 'bytes',
      },
      monthlyMessages: {
        used: messagesUsed,
        limit: messagesLimit,
        remaining: typeof messagesLimit === 'number' ? Math.max(0, messagesLimit - messagesUsed) : null,
        unit: 'messages',
      },
      requests: {
        used: requestsUsed,
        limit: requestsLimit,
        remaining: typeof requestsLimit === 'number' ? Math.max(0, requestsLimit - requestsUsed) : null,
        unit: 'requests',
      },
      appointments: {
        used: appointmentsUsed,
        limit: appointmentsLimit,
        remaining: typeof appointmentsLimit === 'number' ? Math.max(0, appointmentsLimit - appointmentsUsed) : null,
        unit: 'appointments',
      },
    },
    features: {
      customDomain: canCustomDomain,
      whatsapp: canWhatsapp,
      email: canEmail,
      exportReports: canExportReports,
      customBranding: canCustomBranding,
    },
  };

  res.status(200).json(new ApiResponse(200, responseData, 'Application usage retrieved successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/applications/:id/settings
// ---------------------------------------------------------------------------
export const getApplicationSettings = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const websiteSetting = await WebsiteSetting.findOne({ _id: String(app.tenantId) })
    .setOptions({ bypassTenantQuery: true })
    .lean();

  const customBrandingAllowed = await EntitlementService.can(app._id, 'customBranding');

  const settingsData = {
    application: {
      id: app._id,
      name: app.name,
      slug: app.slug,
      status: app.status,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    },
    branding: {
      cscName: websiteSetting?.cscName || app.name,
      tagline: websiteSetting?.tagline || '',
      description: websiteSetting?.description || '',
      logoUrl: websiteSetting?.logoUrl || '',
      darkLogoUrl: websiteSetting?.darkLogoUrl || '',
      faviconUrl: websiteSetting?.faviconUrl || '',
      theme: websiteSetting?.theme || {
        primaryColor: '#FF6700',
        secondaryColor: '#0D0D0D',
        accentColor: '#FFB800',
        borderRadius: '8px',
        fontFamily: 'Inter, sans-serif',
      },
      contact: websiteSetting?.contact || {},
      businessProfile: websiteSetting?.businessProfile || {},
      socialLinks: websiteSetting?.socialLinks || {},
    },
    entitlements: {
      customBranding: customBrandingAllowed,
    },
  };

  res.status(200).json(new ApiResponse(200, settingsData, 'Application settings retrieved successfully'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/platform/applications/:id/settings
// ---------------------------------------------------------------------------
export const updateApplicationSettings = asyncHandler(async (req: Request, res: Response) => {
  const { app } = await verifyAppOwnership(req.user!.userId, req.params.id);

  const {
    name,
    description,
    tagline,
    logoUrl,
    darkLogoUrl,
    faviconUrl,
    theme,
    contact,
    businessProfile,
    socialLinks,
    cscName,
  } = req.body;

  // 1. Update Application name if provided
  if (name && typeof name === 'string' && name.trim().length > 0) {
    app.name = name.trim();
    await app.save();

    // Also update Tenant name
    await Tenant.updateOne({ _id: app.tenantId }, { $set: { name: name.trim() } });
  }

  // 2. Update WebsiteSetting
  const settingUpdate: Record<string, any> = {};
  if (description !== undefined) settingUpdate.description = description;
  if (tagline !== undefined) settingUpdate.tagline = tagline;
  if (cscName !== undefined) settingUpdate.cscName = cscName;
  if (logoUrl !== undefined) settingUpdate.logoUrl = logoUrl;
  if (darkLogoUrl !== undefined) settingUpdate.darkLogoUrl = darkLogoUrl;
  if (faviconUrl !== undefined) settingUpdate.faviconUrl = faviconUrl;
  if (contact && typeof contact === 'object') settingUpdate.contact = contact;
  if (businessProfile && typeof businessProfile === 'object') settingUpdate.businessProfile = businessProfile;
  if (socialLinks && typeof socialLinks === 'object') settingUpdate.socialLinks = socialLinks;

  if (theme && typeof theme === 'object') {
    settingUpdate.theme = {
      primaryColor: theme.primaryColor || '#FF6700',
      secondaryColor: theme.secondaryColor || '#0D0D0D',
      accentColor: theme.accentColor || '#FFB800',
      borderRadius: theme.borderRadius || '8px',
      fontFamily: theme.fontFamily || 'Inter, sans-serif',
    };
  }

  await WebsiteSetting.updateOne(
    { _id: String(app.tenantId) },
    { $set: settingUpdate },
    { upsert: true },
  ).setOptions({ bypassTenantQuery: true });

  const updatedSetting = await WebsiteSetting.findOne({ _id: String(app.tenantId) })
    .setOptions({ bypassTenantQuery: true })
    .lean();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        application: {
          id: app._id,
          name: app.name,
          slug: app.slug,
          status: app.status,
          updatedAt: app.updatedAt,
        },
        branding: updatedSetting,
      },
      'Application settings updated successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/suspend
// ---------------------------------------------------------------------------
export const suspendApplication = asyncHandler(async (req: Request, res: Response) => {
  const { app, account } = await verifyAppOwnership(req.user!.userId, req.params.id);

  if (app.status === ApplicationStatus.ARCHIVED) {
    throw ApiError.badRequest('Archived applications cannot be suspended');
  }

  if (app.status === ApplicationStatus.SUSPENDED) {
    throw ApiError.badRequest('Application is already suspended');
  }

  const oldStatus = app.status;
  app.status = ApplicationStatus.SUSPENDED;
  await app.save();

  await Tenant.updateOne({ _id: app.tenantId }, { $set: { status: TenantStatus.SUSPENDED } });

  await SubscriptionAuditLog.create({
    applicationId: app._id,
    accountId: account._id,
    actorId: new mongoose.Types.ObjectId(req.user!.userId),
    action: 'APPLICATION_SUSPENDED',
    oldStatus,
    newStatus: ApplicationStatus.SUSPENDED,
    reason: (req.body?.reason as string) || 'Suspended by account owner',
  });

  res.status(200).json(new ApiResponse(200, { id: app._id, status: app.status }, 'Application suspended successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/resume
// ---------------------------------------------------------------------------
export const resumeApplication = asyncHandler(async (req: Request, res: Response) => {
  const { app, account } = await verifyAppOwnership(req.user!.userId, req.params.id);

  if (app.status === ApplicationStatus.ARCHIVED) {
    throw ApiError.badRequest('Archived applications cannot be resumed directly');
  }

  if (app.status === ApplicationStatus.ACTIVE) {
    res.status(200).json(new ApiResponse(200, { id: app._id, status: app.status }, 'Application is already active'));
    return;
  }

  const oldStatus = app.status;
  app.status = ApplicationStatus.ACTIVE;
  await app.save();

  await Tenant.updateOne({ _id: app.tenantId }, { $set: { status: TenantStatus.ACTIVE } });

  await SubscriptionAuditLog.create({
    applicationId: app._id,
    accountId: account._id,
    actorId: new mongoose.Types.ObjectId(req.user!.userId),
    action: 'APPLICATION_RESUMED',
    oldStatus,
    newStatus: ApplicationStatus.ACTIVE,
    reason: (req.body?.reason as string) || 'Resumed by account owner',
  });

  res.status(200).json(new ApiResponse(200, { id: app._id, status: app.status }, 'Application resumed successfully'));
});

// ---------------------------------------------------------------------------
// POST /api/v1/platform/applications/:id/archive
// ---------------------------------------------------------------------------
export const archiveApplication = asyncHandler(async (req: Request, res: Response) => {
  const { app, account } = await verifyAppOwnership(req.user!.userId, req.params.id);

  if (app.status === ApplicationStatus.ARCHIVED) {
    throw ApiError.badRequest('Application is already archived');
  }

  const oldStatus = app.status;
  app.status = ApplicationStatus.ARCHIVED;
  await app.save();

  await Tenant.updateOne({ _id: app.tenantId }, { $set: { status: TenantStatus.SUSPENDED } });

  // Deactivate custom domain edge routes
  const domains = await ApplicationDomain.find({ applicationId: app._id, type: DomainType.CUSTOM });
  for (const domain of domains) {
    await DomainProvisioningService.deactivateDomain(domain.hostname);
  }

  await SubscriptionAuditLog.create({
    applicationId: app._id,
    accountId: account._id,
    actorId: new mongoose.Types.ObjectId(req.user!.userId),
    action: 'APPLICATION_ARCHIVED',
    oldStatus,
    newStatus: ApplicationStatus.ARCHIVED,
    reason: (req.body?.reason as string) || 'Archived by account owner',
  });

  res.status(200).json(new ApiResponse(200, { id: app._id, status: app.status }, 'Application archived successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/account
// ---------------------------------------------------------------------------
export const getAccountProfile = asyncHandler(async (req: Request, res: Response) => {
  let account = await Account.findOne({ ownerUserId: req.user!.userId });
  if (!account) {
    account = await Account.create({
      ownerUserId: req.user!.userId as any,
      name: `${req.user!.userId}'s Account`,
      status: AccountStatus.ACTIVE,
    });
  }

  const user = await User.findById(req.user!.userId)
    .select('-password -otp -otpExpiry -passwordResetToken -passwordResetExpiry')
    .setOptions({ bypassTenantQuery: true })
    .lean();
  if (!user) {
    throw ApiError.notFound('User profile not found');
  }

  const appCount = await Application.countDocuments({ accountId: account._id });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        account: {
          id: account._id,
          name: account.name,
          status: account.status,
          createdAt: account.createdAt,
          totalApplications: appCount,
        },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isMobileVerified: (user as any).isMobileVerified ?? false,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          lastLoginIp: user.lastLoginIp,
        },
      },
      'Account profile retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/platform/account
// ---------------------------------------------------------------------------
export const updateAccountProfile = asyncHandler(async (req: Request, res: Response) => {
  let account = await Account.findOne({ ownerUserId: req.user!.userId });
  if (!account) {
    account = await Account.create({
      ownerUserId: req.user!.userId as any,
      name: `${req.user!.userId}'s Account`,
      status: AccountStatus.ACTIVE,
    });
  }

  const { accountName, name, mobile } = req.body;

  if (accountName && typeof accountName === 'string' && accountName.trim().length > 0) {
    account.name = accountName.trim();
    await account.save();
  }

  const userUpdate: any = {};
  if (name && typeof name === 'string' && name.trim().length > 0) {
    userUpdate.name = name.trim();
  }

  if (mobile && typeof mobile === 'string' && mobile.trim().length > 0) {
    userUpdate.mobile = mobile.trim();
  }

  if (Object.keys(userUpdate).length > 0) {
    await User.updateOne({ _id: req.user!.userId }, { $set: userUpdate }).setOptions({ bypassTenantQuery: true });
  }

  const updatedUser = await User.findById(req.user!.userId).setOptions({ bypassTenantQuery: true }).lean();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        account: {
          id: account._id,
          name: account.name,
          status: account.status,
        },
        user: {
          id: updatedUser?._id,
          name: updatedUser?.name,
          email: updatedUser?.email,
          mobile: updatedUser?.mobile,
          role: updatedUser?.role,
        },
      },
      'Profile updated successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/account/security
// ---------------------------------------------------------------------------
export const getAccountSecurity = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.userId)
    .select('email isEmailVerified isMobileVerified lastLoginAt lastLoginIp failedLoginAttempts lockUntil updatedAt createdAt')
    .setOptions({ bypassTenantQuery: true })
    .lean();

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        securityStatus: 'SECURE',
        email: user.email,
        mobile: (user as any).mobile,
        isEmailVerified: user.isEmailVerified,
        isMobileVerified: (user as any).isMobileVerified,
        lastLoginAt: user.lastLoginAt,
        lastLoginIp: user.lastLoginIp,
        failedLoginAttempts: (user as any).failedLoginAttempts || 0,
        isLocked: !!(user as any).lockUntil && new Date((user as any).lockUntil) > new Date(),
        createdAt: user.createdAt,
        securityRecommendations: [
          'Use a strong unique password with letters, numbers, and symbols.',
          'Never share your account credentials with anyone.',
          'Verify that your custom domain DNS records point strictly to UseSetu edge nodes.',
        ],
      },
      'Security information retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/platform/notifications
// ---------------------------------------------------------------------------
export const getPlatformNotifications = asyncHandler(async (req: Request, res: Response) => {
  let account = await Account.findOne({ ownerUserId: req.user!.userId });
  if (!account) {
    account = await Account.create({
      ownerUserId: req.user!.userId as any,
      name: `${req.user!.userId}'s Account`,
      status: AccountStatus.ACTIVE,
    });
  }

  const applications = await Application.find({ accountId: account._id }).lean();

  const dynamicNotifications: any[] = [];

  // Generate dynamic live alerts
  for (const app of applications) {
    // 1. Quota warnings
    const storageUsed = await EntitlementService.getUsage(app._id, 'storage_bytes');
    const storageLimit = await EntitlementService.getLimit(app._id, 'storage_bytes');

    if (typeof storageLimit === 'number' && storageLimit > 0) {
      const percentage = Math.round((storageUsed / storageLimit) * 100);
      if (percentage >= 100) {
        dynamicNotifications.push({
          id: `quota-storage-100-${app._id}`,
          category: PlatformNotificationCategory.QUOTA,
          type: PlatformNotificationType.ERROR,
          title: `Storage Quota Exceeded (${app.name})`,
          message: `Storage limit reached (100%). New file uploads are currently blocked.`,
          link: `/platform/applications/${app._id}/usage`,
          isRead: false,
          createdAt: app.updatedAt,
        });
      } else if (percentage >= 90) {
        dynamicNotifications.push({
          id: `quota-storage-90-${app._id}`,
          category: PlatformNotificationCategory.QUOTA,
          type: PlatformNotificationType.WARNING,
          title: `Storage Quota Warning (${app.name})`,
          message: `Only 10% storage remaining (${percentage}% used). Consider upgrading your plan.`,
          link: `/platform/applications/${app._id}/usage`,
          isRead: false,
          createdAt: app.updatedAt,
        });
      } else if (percentage >= 80) {
        dynamicNotifications.push({
          id: `quota-storage-80-${app._id}`,
          category: PlatformNotificationCategory.QUOTA,
          type: PlatformNotificationType.WARNING,
          title: `Storage Quota Notice (${app.name})`,
          message: `Storage usage is approaching your plan limit (${percentage}% used).`,
          link: `/platform/applications/${app._id}/usage`,
          isRead: false,
          createdAt: app.updatedAt,
        });
      }
    }

    // 2. Domain verification warnings
    const pendingDomains = await ApplicationDomain.find({
      applicationId: app._id,
      type: DomainType.CUSTOM,
      status: { $in: [DomainStatus.PENDING, DomainStatus.FAILED] },
    }).lean();

    for (const domain of pendingDomains) {
      dynamicNotifications.push({
        id: `domain-pending-${domain._id}`,
        category: PlatformNotificationCategory.DOMAIN,
        type: PlatformNotificationType.WARNING,
        title: `DNS Verification Pending (${domain.hostname})`,
        message: `Your custom domain "${domain.hostname}" for "${app.name}" is waiting for DNS verification.`,
        link: `/platform/applications/${app._id}/domains`,
        isRead: false,
        createdAt: domain.createdAt,
      });
    }

    // 3. Subscription status
    const sub = await SubscriptionService.getCurrentSubscription(app._id);
    if (sub && sub.status === SubscriptionStatus.TRIALING && sub.trialEndsAt) {
      const daysLeft = Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 3 && daysLeft >= 0) {
        dynamicNotifications.push({
          id: `sub-trial-${app._id}`,
          category: PlatformNotificationCategory.SUBSCRIPTION,
          type: PlatformNotificationType.INFO,
          title: `Trial Ending Soon (${app.name})`,
          message: `Your free trial expires in ${daysLeft} days. Choose a plan to maintain full access.`,
          link: `/platform/applications/${app._id}/billing`,
          isRead: false,
          createdAt: sub.createdAt,
        });
      }
    }
  }

  // Persisted notifications from PlatformNotification
  const persisted = await PlatformNotification.find({ accountId: account._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const allNotifications = [
    ...dynamicNotifications,
    ...persisted.map((p) => ({
      id: String(p._id),
      category: p.category,
      type: p.type,
      title: p.title,
      message: p.message,
      link: p.link,
      isRead: p.isRead,
      createdAt: p.createdAt,
    })),
  ];

  const unreadCount = allNotifications.filter((n) => !n.isRead).length;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications: allNotifications,
        unreadCount,
      },
      'Platform notifications retrieved successfully',
    ),
  );
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/platform/notifications/:id/read
// ---------------------------------------------------------------------------
export const markPlatformNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const account = await Account.findOne({ ownerUserId: req.user!.userId });
  if (!account) {
    throw ApiError.forbidden('Account not found');
  }

  if (mongoose.isValidObjectId(id)) {
    const updated = await PlatformNotification.findOneAndUpdate(
      { _id: id, accountId: account._id },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    );
    if (!updated) {
      throw ApiError.notFound('Notification not found or access denied');
    }
  }

  res.status(200).json(new ApiResponse(200, { id, isRead: true }, 'Notification marked as read'));
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/platform/notifications/read-all
// ---------------------------------------------------------------------------
export const markAllPlatformNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
  const account = await Account.findOne({ ownerUserId: req.user!.userId });
  if (account) {
    await PlatformNotification.updateMany(
      { accountId: account._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  res.status(200).json(new ApiResponse(200, { success: true }, 'All notifications marked as read'));
});
