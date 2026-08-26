import mongoose from 'mongoose';
import { env } from '../config/env';
import { Plan, IPlan, PlanStatus, IPlanEntitlements } from '../models/plan.model';
import { Subscription, ISubscription, SubscriptionStatus, BillingCycle } from '../models/subscription.model';
import { SubscriptionAuditLog } from '../models/subscriptionAuditLog.model';
import { Application } from '../models/application.model';
import { ApiError } from '../utils/ApiError';

export class SubscriptionService {
  /**
   * Fetch the default fallback plan (e.g. 'free')
   */
  static async getDefaultPlan(): Promise<IPlan> {
    let defaultPlan = await Plan.findOne({ isDefault: true, status: PlanStatus.ACTIVE });
    if (!defaultPlan) {
      defaultPlan = await Plan.findOne({ slug: 'free', status: PlanStatus.ACTIVE });
    }
    if (!defaultPlan) {
      defaultPlan = await Plan.findOne({ status: PlanStatus.ACTIVE }).sort({ createdAt: 1 });
    }
    if (!defaultPlan) {
      throw ApiError.internal('No active default plan configured in the system');
    }
    return defaultPlan;
  }

  /**
   * Get the current effective subscription for an application.
   * Auto-evaluates expiration if end dates have passed.
   */
  static async getCurrentSubscription(
    applicationId: string | mongoose.Types.ObjectId,
  ): Promise<(ISubscription & { planId: IPlan }) | null> {
    const appObjectId = new mongoose.Types.ObjectId(applicationId);

    const subscription = (await Subscription.findOne({
      applicationId: appObjectId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] },
    }).populate('planId')) as (ISubscription & { planId: IPlan }) | null;

    if (!subscription) {
      return null;
    }

    const now = new Date();

    // Check past_due grace period expiration
    if (
      subscription.status === SubscriptionStatus.PAST_DUE &&
      subscription.gracePeriodEndsAt &&
      subscription.gracePeriodEndsAt < now
    ) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();

      const app = await Application.findById(appObjectId);
      if (app) {
        await SubscriptionAuditLog.create({
          applicationId: app._id,
          accountId: app.accountId,
          action: 'SUBSCRIPTION_EXPIRED',
          oldStatus: SubscriptionStatus.PAST_DUE,
          newStatus: SubscriptionStatus.EXPIRED,
          reason: 'Grace period expired',
        });
      }
      return null;
    }

    // Check trial expiration
    if (
      subscription.status === SubscriptionStatus.TRIALING &&
      subscription.trialEndsAt &&
      subscription.trialEndsAt < now
    ) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();

      const app = await Application.findById(appObjectId);
      if (app) {
        await SubscriptionAuditLog.create({
          applicationId: app._id,
          accountId: app.accountId,
          action: 'SUBSCRIPTION_EXPIRED',
          oldStatus: SubscriptionStatus.TRIALING,
          newStatus: SubscriptionStatus.EXPIRED,
          reason: 'Trial period expired',
        });
      }
      return null;
    }

    // Check active period expiration (for fixed-term subscriptions without grace)
    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.endsAt &&
      subscription.endsAt < now
    ) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await subscription.save();

      const app = await Application.findById(appObjectId);
      if (app) {
        await SubscriptionAuditLog.create({
          applicationId: app._id,
          accountId: app.accountId,
          action: 'SUBSCRIPTION_EXPIRED',
          oldStatus: SubscriptionStatus.ACTIVE,
          newStatus: SubscriptionStatus.EXPIRED,
          reason: 'Subscription period ended',
        });
      }
      return null;
    }

    return subscription;
  }

  /**
   * Create an initial subscription for an application.
   */
  static async createSubscription(params: {
    applicationId: string | mongoose.Types.ObjectId;
    planId?: string | mongoose.Types.ObjectId;
    planSlug?: string;
    billingCycle?: BillingCycle;
    trialDays?: number;
    actorId?: string;
    reason?: string;
  }): Promise<ISubscription> {
    const appObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) throw ApiError.notFound('Application not found');

    // Ensure no other active subscription exists
    const existingActive = await Subscription.findOne({
      applicationId: appObjectId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    });
    if (existingActive) {
      throw ApiError.conflict('Application already has an active or trialing subscription');
    }

    // Resolve plan
    let plan: IPlan | null = null;
    if (params.planId) {
      plan = await Plan.findById(params.planId);
    } else if (params.planSlug) {
      plan = await Plan.findOne({ slug: params.planSlug.toLowerCase() });
    } else {
      plan = await this.getDefaultPlan();
    }

    if (!plan || plan.status !== PlanStatus.ACTIVE) {
      throw ApiError.badRequest('Requested plan not found or is inactive');
    }

    const now = new Date();
    const isTrial = typeof params.trialDays === 'number' && params.trialDays > 0;
    const trialEndsAt = isTrial ? new Date(now.getTime() + params.trialDays! * 24 * 60 * 60 * 1000) : undefined;

    const subscription = await Subscription.create({
      applicationId: appObjectId,
      planId: plan._id,
      status: isTrial ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      billingCycle: params.billingCycle || BillingCycle.MONTHLY,
      startsAt: now,
      trialEndsAt,
      planSnapshot: {
        planId: plan._id as any,
        slug: plan.slug,
        name: plan.name,
        entitlements: plan.entitlements,
        version: plan.version,
      },
      metadata: {},
    });

    await SubscriptionAuditLog.create({
      applicationId: appObjectId,
      accountId: app.accountId,
      actorId: params.actorId ? new mongoose.Types.ObjectId(params.actorId) : undefined,
      action: 'SUBSCRIPTION_CREATED',
      newPlan: {
        id: plan._id as any,
        slug: plan.slug,
        name: plan.name,
      },
      newStatus: subscription.status,
      reason: params.reason || (isTrial ? 'Trial initialized' : 'Initial subscription created'),
    });

    return subscription;
  }

  /**
   * Change plan for an application (Upgrade or Downgrade).
   * Ensures data safety on downgrade: existing data is never deleted,
   * but over_quota state is flagged if usage exceeds the new plan's limits.
   */
  static async changePlan(params: {
    applicationId: string | mongoose.Types.ObjectId;
    newPlanId?: string | mongoose.Types.ObjectId;
    newPlanSlug?: string;
    billingCycle?: BillingCycle;
    actorId?: string;
    reason?: string;
  }): Promise<ISubscription> {
    const appObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) throw ApiError.notFound('Application not found');

    const currentSub = await Subscription.findOne({
      applicationId: appObjectId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    }).populate('planId');

    if (!currentSub) {
      throw ApiError.badRequest('No active subscription found to change plan');
    }

    // Resolve target plan
    let newPlan: IPlan | null = null;
    if (params.newPlanId) {
      newPlan = await Plan.findById(params.newPlanId);
    } else if (params.newPlanSlug) {
      newPlan = await Plan.findOne({ slug: params.newPlanSlug.toLowerCase() });
    }

    if (!newPlan || newPlan.status !== PlanStatus.ACTIVE) {
      throw ApiError.badRequest('Target plan not found or is inactive');
    }

    const oldPlanDoc = currentSub.planId as any;
    const oldPlanInfo = {
      id: oldPlanDoc._id,
      slug: oldPlanDoc.slug || currentSub.planSnapshot?.slug,
      name: oldPlanDoc.name || currentSub.planSnapshot?.name,
    };

    // Check if downgrade causes over_quota state without deleting existing data
    const { EntitlementService } = await import('./entitlement.service');
    const storageUsage = await EntitlementService.getUsage(appObjectId, 'storage_bytes');
    const activeUsersUsage = await EntitlementService.getUsage(appObjectId, 'active_users');

    const isOverStorage = storageUsage > newPlan.entitlements.storage.limit;
    const isOverUsers = activeUsersUsage > newPlan.entitlements.activeUsers.limit;
    const isOverQuota = isOverStorage || isOverUsers;

    currentSub.planId = newPlan._id as any;
    currentSub.planSnapshot = {
      planId: newPlan._id as any,
      slug: newPlan.slug,
      name: newPlan.name,
      entitlements: newPlan.entitlements,
      version: newPlan.version,
    };

    if (params.billingCycle) {
      currentSub.billingCycle = params.billingCycle;
    }

    currentSub.metadata = {
      ...(currentSub.metadata || {}),
      over_quota: isOverQuota,
      over_quota_details: isOverQuota
        ? {
            storage: isOverStorage ? { used: storageUsage, limit: newPlan.entitlements.storage.limit } : undefined,
            activeUsers: isOverUsers ? { used: activeUsersUsage, limit: newPlan.entitlements.activeUsers.limit } : undefined,
          }
        : undefined,
    };

    await currentSub.save();

    await SubscriptionAuditLog.create({
      applicationId: appObjectId,
      accountId: app.accountId,
      actorId: params.actorId ? new mongoose.Types.ObjectId(params.actorId) : undefined,
      action: 'PLAN_CHANGED',
      oldPlan: oldPlanInfo,
      newPlan: {
        id: newPlan._id as any,
        slug: newPlan.slug,
        name: newPlan.name,
      },
      oldStatus: currentSub.status,
      newStatus: currentSub.status,
      reason: params.reason || 'Plan changed by user/admin',
      metadata: { isOverQuota },
    });

    return currentSub;
  }

  /**
   * Cancel an application's active subscription.
   */
  static async cancelSubscription(params: {
    applicationId: string | mongoose.Types.ObjectId;
    reason?: string;
    actorId?: string;
  }): Promise<ISubscription> {
    const appObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) throw ApiError.notFound('Application not found');

    const currentSub = await Subscription.findOne({
      applicationId: appObjectId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] },
    });

    if (!currentSub) {
      throw ApiError.badRequest('No active subscription found to cancel');
    }

    const oldStatus = currentSub.status;
    currentSub.status = SubscriptionStatus.CANCELLED;
    currentSub.cancelledAt = new Date();
    await currentSub.save();

    await SubscriptionAuditLog.create({
      applicationId: appObjectId,
      accountId: app.accountId,
      actorId: params.actorId ? new mongoose.Types.ObjectId(params.actorId) : undefined,
      action: 'SUBSCRIPTION_CANCELLED',
      oldStatus,
      newStatus: SubscriptionStatus.CANCELLED,
      reason: params.reason || 'Cancelled by user',
    });

    return currentSub;
  }

  /**
   * Activate or upgrade subscription upon verified payment
   */
  static async activateFromPayment(params: {
    applicationId: string | mongoose.Types.ObjectId;
    planId: string | mongoose.Types.ObjectId;
    billingCycle: BillingCycle;
    paymentTransactionId?: string | mongoose.Types.ObjectId;
    provider?: string;
    providerPaymentId?: string;
    providerOrderId?: string;
    actorId?: string;
    metadata?: Record<string, any>;
  }): Promise<ISubscription> {
    const appObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) throw ApiError.notFound('Application not found');

    const plan = await Plan.findById(params.planId);
    if (!plan || plan.status !== PlanStatus.ACTIVE) {
      throw ApiError.badRequest('Target plan not found or is inactive');
    }

    let sub = await Subscription.findOne({
      applicationId: appObjectId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE] },
    });

    const now = new Date();
    const cycleDurationDays = params.billingCycle === BillingCycle.YEARLY ? 365 : 30;
    const endsAt = new Date(now.getTime() + cycleDurationDays * 24 * 60 * 60 * 1000);

    const oldStatus = sub?.status || SubscriptionStatus.ACTIVE;
    const oldPlan = sub?.planSnapshot ? { id: sub.planSnapshot.planId, slug: sub.planSnapshot.slug, name: sub.planSnapshot.name } : undefined;

    // Check if downgrade causes over_quota state without deleting existing data
    const { EntitlementService } = await import('./entitlement.service');
    const storageUsage = await EntitlementService.getUsage(appObjectId, 'storage_bytes');
    const activeUsersUsage = await EntitlementService.getUsage(appObjectId, 'active_users');

    const isOverStorage = storageUsage > plan.entitlements.storage.limit;
    const isOverUsers = activeUsersUsage > plan.entitlements.activeUsers.limit;
    const isOverQuota = isOverStorage || isOverUsers;

    if (sub) {
      sub.planId = plan._id as any;
      sub.status = SubscriptionStatus.ACTIVE;
      sub.billingCycle = params.billingCycle;
      sub.startsAt = now;
      sub.endsAt = endsAt;
      sub.trialEndsAt = undefined;
      sub.cancelledAt = undefined;
      sub.gracePeriodEndsAt = undefined;
      sub.recoveryAttempts = 0;
      sub.planSnapshot = {
        planId: plan._id as any,
        slug: plan.slug,
        name: plan.name,
        entitlements: plan.entitlements,
        version: plan.version,
      };
      sub.paymentGateway = {
        provider: params.provider || 'razorpay',
        metadata: {
          paymentTransactionId: params.paymentTransactionId,
          providerPaymentId: params.providerPaymentId,
          providerOrderId: params.providerOrderId,
        },
      };
      sub.metadata = {
        ...(sub.metadata || {}),
        over_quota: isOverQuota,
        lastPaymentAt: now,
        ...(params.metadata || {}),
      };
      await sub.save();
    } else {
      sub = await Subscription.create({
        applicationId: appObjectId,
        planId: plan._id,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: params.billingCycle,
        startsAt: now,
        endsAt,
        planSnapshot: {
          planId: plan._id as any,
          slug: plan.slug,
          name: plan.name,
          entitlements: plan.entitlements,
          version: plan.version,
        },
        paymentGateway: {
          provider: params.provider || 'razorpay',
          metadata: {
            paymentTransactionId: params.paymentTransactionId,
            providerPaymentId: params.providerPaymentId,
            providerOrderId: params.providerOrderId,
          },
        },
        metadata: {
          over_quota: isOverQuota,
          lastPaymentAt: now,
          ...(params.metadata || {}),
        },
      });
    }

    const previousStatus = oldStatus;
    const isUpgrade = oldPlan && oldPlan.slug !== plan.slug;
    const auditAction = previousStatus === SubscriptionStatus.PAST_DUE
      ? 'SUBSCRIPTION_RECOVERED'
      : (isUpgrade ? 'SUBSCRIPTION_UPGRADED' : 'SUBSCRIPTION_ACTIVATED');

    await SubscriptionAuditLog.create({
      applicationId: appObjectId,
      accountId: app.accountId,
      actorId: params.actorId ? new mongoose.Types.ObjectId(params.actorId) : undefined,
      action: auditAction,
      oldPlan: oldPlan ? { id: ((oldPlan as any)._id || (oldPlan as any).id) as any, slug: oldPlan.slug, name: oldPlan.name } : undefined,
      newPlan: {
        id: plan._id as any,
        slug: plan.slug,
        name: plan.name,
      },
      oldStatus: previousStatus,
      newStatus: SubscriptionStatus.ACTIVE,
      reason: `Activated via ${params.provider || 'razorpay'} payment: ${params.providerPaymentId || 'verified'}`,
      metadata: {
        paymentTransactionId: params.paymentTransactionId,
        providerPaymentId: params.providerPaymentId,
        billingCycle: params.billingCycle,
        recoveredFromPastDue: previousStatus === SubscriptionStatus.PAST_DUE,
      },
    });

    // Create Notification
    const { PlatformNotification, PlatformNotificationCategory, PlatformNotificationType } = await import(
      '../models/platformNotification.model'
    );
    await PlatformNotification.create({
      accountId: app.accountId,
      applicationId: app._id,
      category: PlatformNotificationCategory.SUBSCRIPTION,
      type: PlatformNotificationType.SUCCESS,
      title: previousStatus === SubscriptionStatus.PAST_DUE
        ? `Subscription Recovered: ${plan.name}`
        : `Plan ${isUpgrade ? 'Upgraded' : 'Activated'}: ${plan.name}`,
      message: `Your application "${app.name}" is now on the ${plan.name} plan (${params.billingCycle}).`,
      link: `/platform/applications/${app._id}?tab=billing`,
    });

    await this.syncApplicationQuotas(app._id);

    return sub;
  }

  /**
   * Renew subscription upon recurring payment
   */
  static async renewFromPayment(params: {
    applicationId: string | mongoose.Types.ObjectId;
    paymentTransactionId?: string | mongoose.Types.ObjectId;
    providerPaymentId?: string;
    providerOrderId?: string;
    billingCycle?: BillingCycle;
  }): Promise<ISubscription> {
    const appObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) throw ApiError.notFound('Application not found');

    const sub = await Subscription.findOne({
      applicationId: appObjectId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
    }).populate('planId');

    if (!sub) {
      throw ApiError.badRequest('No active or past_due subscription found to renew');
    }

    const previousStatus = sub.status;
    const cycle = params.billingCycle || sub.billingCycle || BillingCycle.MONTHLY;
    const cycleDurationDays = cycle === BillingCycle.YEARLY ? 365 : 30;
    const baseDate = sub.endsAt && sub.endsAt > new Date() ? sub.endsAt : new Date();
    sub.endsAt = new Date(baseDate.getTime() + cycleDurationDays * 24 * 60 * 60 * 1000);
    sub.status = SubscriptionStatus.ACTIVE;
    sub.billingCycle = cycle;
    sub.gracePeriodEndsAt = undefined;
    sub.recoveryAttempts = 0;

    sub.metadata = {
      ...(sub.metadata || {}),
      lastRenewalAt: new Date(),
      lastPaymentAt: new Date(),
    };
    await sub.save();

    const auditAction = previousStatus === SubscriptionStatus.PAST_DUE
      ? 'SUBSCRIPTION_RECOVERED'
      : 'SUBSCRIPTION_RENEWED';

    await SubscriptionAuditLog.create({
      applicationId: appObjectId,
      accountId: app.accountId,
      action: auditAction,
      oldStatus: previousStatus,
      newStatus: SubscriptionStatus.ACTIVE,
      reason: `Renewed via payment: ${params.providerPaymentId || 'verified'}`,
      metadata: {
        paymentTransactionId: params.paymentTransactionId,
        providerPaymentId: params.providerPaymentId,
        endsAt: sub.endsAt,
        recoveredFromPastDue: previousStatus === SubscriptionStatus.PAST_DUE,
      },
    });

    const { PlatformNotification, PlatformNotificationCategory, PlatformNotificationType } = await import(
      '../models/platformNotification.model'
    );
    await PlatformNotification.create({
      accountId: app.accountId,
      applicationId: app._id,
      category: PlatformNotificationCategory.SUBSCRIPTION,
      type: PlatformNotificationType.INFO,
      title: `Subscription Renewed: ${sub.planSnapshot?.name || 'Plan'}`,
      message: `Your subscription for "${app.name}" has been renewed until ${sub.endsAt.toLocaleDateString()}.`,
      link: `/platform/applications/${app._id}?tab=billing`,
    });

    await this.syncApplicationQuotas(app._id);

    return sub;
  }

  /**
   * Mark subscription as past_due on payment failure with a 7-day grace period
   */
  static async markPaymentFailed(params: {
    applicationId: string | mongoose.Types.ObjectId;
    failureReason?: string;
    providerPaymentId?: string;
    gracePeriodDays?: number;
  }): Promise<ISubscription | null> {
    const appObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) return null;

    const sub = await Subscription.findOne({
      applicationId: appObjectId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE] },
    });

    if (sub) {
      const oldStatus = sub.status;
      const graceDays = params.gracePeriodDays ?? env.BILLING_GRACE_PERIOD_DAYS ?? 7;
      const gracePeriodEndsAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);

      sub.status = SubscriptionStatus.PAST_DUE;
      sub.gracePeriodEndsAt = sub.gracePeriodEndsAt && sub.gracePeriodEndsAt > new Date()
        ? sub.gracePeriodEndsAt
        : gracePeriodEndsAt;
      sub.lastPaymentRetryAt = new Date();
      sub.recoveryAttempts = (sub.recoveryAttempts || 0) + 1;
      sub.metadata = {
        ...(sub.metadata || {}),
        lastPaymentFailure: {
          date: new Date(),
          reason: params.failureReason,
          providerPaymentId: params.providerPaymentId,
        },
      };
      await sub.save();

      await SubscriptionAuditLog.create({
        applicationId: appObjectId,
        accountId: app.accountId,
        action: 'PAYMENT_FAILED',
        oldStatus,
        newStatus: SubscriptionStatus.PAST_DUE,
        reason: params.failureReason || 'Payment failed at provider; grace period initiated',
        metadata: {
          gracePeriodEndsAt: sub.gracePeriodEndsAt,
          recoveryAttempts: sub.recoveryAttempts,
          providerPaymentId: params.providerPaymentId,
        },
      });

      const { PlatformNotification, PlatformNotificationCategory, PlatformNotificationType } = await import(
        '../models/platformNotification.model'
      );
      await PlatformNotification.create({
        accountId: app.accountId,
        applicationId: app._id,
        category: PlatformNotificationCategory.SUBSCRIPTION,
        type: PlatformNotificationType.ERROR,
        title: `Payment Failed: Grace Period Active for ${sub.planSnapshot?.name || 'Subscription'}`,
        message: `Payment failed for "${app.name}". Your services remain active under a ${graceDays}-day grace period until ${sub.gracePeriodEndsAt.toLocaleDateString()}. Please update payment method to avoid service interruption.`,
        link: `/platform/applications/${app._id}?tab=billing`,
      });
    }

    return sub;
  }

  /**
   * Expire subscription after grace period lapses
   */
  static async expireSubscription(params: {
    applicationId: string | mongoose.Types.ObjectId;
    reason?: string;
  }): Promise<ISubscription | null> {
    const appObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) return null;

    const sub = await Subscription.findOne({
      applicationId: appObjectId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.TRIALING] },
    });

    if (sub) {
      const oldStatus = sub.status;
      sub.status = SubscriptionStatus.EXPIRED;
      sub.gracePeriodEndsAt = undefined;
      await sub.save();

      await SubscriptionAuditLog.create({
        applicationId: appObjectId,
        accountId: app.accountId,
        action: 'SUBSCRIPTION_EXPIRED',
        oldStatus,
        newStatus: SubscriptionStatus.EXPIRED,
        reason: params.reason || 'Subscription expired after grace period',
      });

      const { PlatformNotification, PlatformNotificationCategory, PlatformNotificationType } = await import(
        '../models/platformNotification.model'
      );
      await PlatformNotification.create({
        accountId: app.accountId,
        applicationId: app._id,
        category: PlatformNotificationCategory.SUBSCRIPTION,
        type: PlatformNotificationType.WARNING,
        title: `Subscription Expired`,
        message: `Your subscription for "${app.name}" has expired. Services have fallen back to the free tier limits.`,
        link: `/platform/applications/${app._id}?tab=billing`,
      });

      await this.syncApplicationQuotas(app._id);
    }

    return sub;
  }

  /**
   * Sync and audit application quotas against effective plan entitlements
   */
  static async syncApplicationQuotas(applicationId: string | mongoose.Types.ObjectId): Promise<{
    overQuota: boolean;
    activeUsersExceeded: boolean;
    storageExceeded: boolean;
  }> {
    const appObjectId = new mongoose.Types.ObjectId(applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) return { overQuota: false, activeUsersExceeded: false, storageExceeded: false };

    const entitlements = await this.resolveEffectiveEntitlements(appObjectId);

    const { User } = await import('../models/user.model');
    const { MediaAsset } = await import('../models/mediaAsset.model');
    const { LockerDocument } = await import('../models/lockerDocument.model');

    const [userCount, mediaAssets, lockerDocs] = await Promise.all([
      User.countDocuments({ tenantId: app.tenantId, isActive: true }).setOptions({ bypassTenantQuery: true }),
      MediaAsset.find({ tenantId: app.tenantId }).select('sizeBytes').setOptions({ bypassTenantQuery: true }).lean(),
      LockerDocument.find({ tenantId: app.tenantId }).select('sizeBytes').setOptions({ bypassTenantQuery: true }).lean(),
    ]);

    const mediaBytes = (mediaAssets as any[]).reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    const lockerBytes = (lockerDocs as any[]).reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
    const totalStorageBytes = mediaBytes + lockerBytes;

    const userLimit = entitlements.activeUsers?.limit ?? 5;
    const storageLimit = entitlements.storage?.limit ?? 524288000;

    const activeUsersExceeded = userCount > userLimit;
    const storageExceeded = totalStorageBytes > storageLimit;
    const overQuota = activeUsersExceeded || storageExceeded;

    const sub = await Subscription.findOne({
      applicationId: appObjectId,
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.TRIALING] },
    });

    if (sub) {
      sub.metadata = {
        ...(sub.metadata || {}),
        over_quota: overQuota,
        over_quota_details: overQuota
          ? {
              storage: storageExceeded ? { used: totalStorageBytes, limit: storageLimit } : undefined,
              activeUsers: activeUsersExceeded ? { used: userCount, limit: userLimit } : undefined,
            }
          : undefined,
        quotaSyncAt: new Date(),
      };
      await sub.save();
    }

    return {
      overQuota,
      activeUsersExceeded,
      storageExceeded,
    };
  }

  /**
   * Resolve effective entitlements for an application.
   * If subscription is missing or expired, falls back to default free plan entitlements.
   */
  static async resolveEffectiveEntitlements(
    applicationId: string | mongoose.Types.ObjectId,
  ): Promise<IPlanEntitlements> {
    const sub = await this.getCurrentSubscription(applicationId);
    if (sub && sub.planSnapshot?.entitlements) {
      return sub.planSnapshot.entitlements;
    }
    if (sub && sub.planId && (sub.planId as any).entitlements) {
      return (sub.planId as any).entitlements;
    }

    // Fallback to default free plan entitlements
    const defaultPlan = await this.getDefaultPlan();
    return defaultPlan.entitlements;
  }
}
