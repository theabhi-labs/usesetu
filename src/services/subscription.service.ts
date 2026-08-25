import mongoose from 'mongoose';
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
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
    }).populate('planId')) as (ISubscription & { planId: IPlan }) | null;

    if (!subscription) {
      return null;
    }

    const now = new Date();

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

    // Check active period expiration (for fixed-term subscriptions)
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
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
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
