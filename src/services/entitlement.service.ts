import mongoose from 'mongoose';
import { UsageRecord } from '../models/usageRecord.model';
import { SubscriptionService } from './subscription.service';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/user.model';
import { MediaAsset } from '../models/mediaAsset.model';
import { LockerDocument } from '../models/lockerDocument.model';
import { Role } from '../types/auth.types';

export class EntitlementService {
  /**
   * Determine the usage period key for a given metric.
   * Gauges use 'current', while monthly counters use 'YYYY-MM'.
   */
  static getPeriod(metric: string): string {
    const gaugeMetrics = ['active_users', 'storage_bytes'];
    if (gaugeMetrics.includes(metric)) {
      return 'current';
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Check if a boolean feature is enabled for the application.
   */
  static async can(applicationId: string | mongoose.Types.ObjectId, feature: string): Promise<boolean> {
    const entitlements = await SubscriptionService.resolveEffectiveEntitlements(applicationId);
    const featureMap: Record<string, boolean | undefined> = {
      customDomain: entitlements.customDomain?.enabled,
      whatsapp: entitlements.whatsapp?.enabled,
      email: entitlements.email?.enabled,
      exportReports: entitlements.exportReports?.enabled,
      customBranding: entitlements.customBranding?.enabled,
    };

    if (feature in featureMap) {
      return Boolean(featureMap[feature]);
    }

    return false;
  }

  /**
   * Get the configured limit for a metric or feature.
   */
  static async getLimit(
    applicationId: string | mongoose.Types.ObjectId,
    featureOrMetric: string,
  ): Promise<number | boolean | null> {
    const entitlements = await SubscriptionService.resolveEffectiveEntitlements(applicationId);

    switch (featureOrMetric) {
      case 'active_users':
      case 'activeUsers':
        return entitlements.activeUsers?.limit ?? 5;
      case 'storage_bytes':
      case 'storage':
        return entitlements.storage?.limit ?? 524288000; // 500 MB default
      case 'whatsapp_messages':
      case 'monthlyMessages':
        return entitlements.monthlyMessages?.limit ?? 100;
      case 'email_messages':
        return entitlements.monthlyMessages?.limit ?? 100;
      case 'requests':
      case 'monthlyRequests':
        return entitlements.monthlyRequests?.limit ?? 200;
      case 'appointments':
      case 'monthlyAppointments':
        return entitlements.monthlyAppointments?.limit ?? 50;
      case 'customDomain':
      case 'custom_domains':
        return entitlements.customDomain?.limit ?? (entitlements.customDomain?.enabled ? 1 : 0);
      case 'whatsapp':
        return entitlements.whatsapp?.enabled ?? false;
      case 'email':
        return entitlements.email?.enabled ?? true;
      case 'exportReports':
        return entitlements.exportReports?.enabled ?? false;
      case 'customBranding':
        return entitlements.customBranding?.enabled ?? false;
      default:
        return null;
    }
  }

  /**
   * Get current usage for a given metric and period.
   */
  static async getUsage(
    applicationId: string | mongoose.Types.ObjectId,
    metric: string,
    period?: string,
  ): Promise<number> {
    const resolvedPeriod = period || this.getPeriod(metric);
    const record = await UsageRecord.findOne({
      applicationId: new mongoose.Types.ObjectId(applicationId),
      metric,
      period: resolvedPeriod,
    });
    return record?.used || 0;
  }

  /**
   * Get remaining quota for a metric.
   */
  static async getRemaining(
    applicationId: string | mongoose.Types.ObjectId,
    metric: string,
    period?: string,
  ): Promise<number> {
    const limit = await this.getLimit(applicationId, metric);
    if (typeof limit !== 'number') return Infinity;

    const used = await this.getUsage(applicationId, metric, period);
    return Math.max(0, limit - used);
  }

  /**
   * Assert that a boolean feature is enabled. Throws 403 Forbidden if disabled.
   */
  static async assertAllowed(applicationId: string | mongoose.Types.ObjectId, feature: string): Promise<void> {
    const allowed = await this.can(applicationId, feature);
    if (!allowed) {
      throw ApiError.forbidden(`Feature "${feature}" is not enabled on your current subscription plan.`);
    }
  }

  /**
   * Assert that a metric is within limits. Throws 403 Forbidden if quota is exceeded.
   */
  static async assertWithinLimit(
    applicationId: string | mongoose.Types.ObjectId,
    metric: string,
    amount = 1,
    period?: string,
  ): Promise<void> {
    const limit = await this.getLimit(applicationId, metric);
    if (typeof limit !== 'number') return;

    const used = await this.getUsage(applicationId, metric, period);
    if (used + amount > limit) {
      throw ApiError.forbidden(
        `Quota exceeded for ${metric}. Current usage: ${used}, limit: ${limit}, requested addition: ${amount}. Please upgrade your plan.`,
      );
    }
  }

  /**
   * Increment metric usage atomically.
   */
  static async recordUsage(
    applicationId: string | mongoose.Types.ObjectId,
    metric: string,
    amount: number,
    period?: string,
  ): Promise<void> {
    if (amount <= 0) return;
    const resolvedPeriod = period || this.getPeriod(metric);
    const limit = await this.getLimit(applicationId, metric);

    await UsageRecord.findOneAndUpdate(
      {
        applicationId: new mongoose.Types.ObjectId(applicationId),
        metric,
        period: resolvedPeriod,
      },
      {
        $inc: { used: amount },
        $set: { limit: typeof limit === 'number' ? limit : undefined },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  /**
   * Decrement metric usage atomically (bounded to zero).
   */
  static async releaseUsage(
    applicationId: string | mongoose.Types.ObjectId,
    metric: string,
    amount: number,
    period?: string,
  ): Promise<void> {
    if (amount <= 0) return;
    const resolvedPeriod = period || this.getPeriod(metric);
    const appObjectId = new mongoose.Types.ObjectId(applicationId);

    const record = await UsageRecord.findOne({
      applicationId: appObjectId,
      metric,
      period: resolvedPeriod,
    });

    if (record) {
      record.used = Math.max(0, record.used - amount);
      await record.save();
    }
  }

  /**
   * Atomic reservation of an active user seat to prevent race conditions during concurrent additions.
   * Active users are defined as Staff or Admin users (role in ['admin', 'staff'], isActive: true).
   */
  static async reserveUserSeat(applicationId: string | mongoose.Types.ObjectId): Promise<void> {
    const appObjectId = new mongoose.Types.ObjectId(applicationId);
    const limit = await this.getLimit(appObjectId, 'active_users');
    const numericLimit = typeof limit === 'number' ? limit : 5;

    // Atomically increment seat count
    const record = await UsageRecord.findOneAndUpdate(
      {
        applicationId: appObjectId,
        metric: 'active_users',
        period: 'current',
      },
      {
        $inc: { used: 1 },
        $set: { limit: numericLimit },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (record.used > numericLimit) {
      // Revert excess reservation
      await UsageRecord.updateOne({ _id: record._id }, { $inc: { used: -1 } });
      throw ApiError.forbidden(
        `Active user seat limit reached (${record.used - 1}/${numericLimit}). Upgrade your plan to add more staff/admin seats.`,
      );
    }
  }

  /**
   * Release reserved user seat (e.g. if user creation failed or user was deleted).
   */
  static async releaseUserSeat(applicationId: string | mongoose.Types.ObjectId): Promise<void> {
    await this.releaseUsage(applicationId, 'active_users', 1);
  }

  /**
   * Recalculate and synchronize exact active user count for an application's tenant.
   * Only active staff and admin seats count.
   */
  static async syncActiveUsersUsage(
    applicationId: string | mongoose.Types.ObjectId,
    tenantId: string | mongoose.Types.ObjectId,
  ): Promise<number> {
    const count = await User.countDocuments({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      role: { $in: [Role.ADMIN, Role.STAFF] },
      isActive: true,
    }).setOptions({ bypassTenantQuery: true });

    const limit = await this.getLimit(applicationId, 'active_users');
    await UsageRecord.findOneAndUpdate(
      {
        applicationId: new mongoose.Types.ObjectId(applicationId),
        metric: 'active_users',
        period: 'current',
      },
      {
        $set: {
          used: count,
          limit: typeof limit === 'number' ? limit : 5,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return count;
  }

  /**
   * Recalculate and synchronize exact storage usage (in bytes) for an application's tenant.
   */
  static async syncStorageUsage(
    applicationId: string | mongoose.Types.ObjectId,
    tenantId: string | mongoose.Types.ObjectId,
  ): Promise<number> {
    const tenantObjectId = new mongoose.Types.ObjectId(tenantId);

    const [mediaRes, lockerRes] = await Promise.all([
      MediaAsset.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $group: { _id: null, totalSize: { $sum: '$size' } } },
      ]).option({ bypassTenantQuery: true }),
      LockerDocument.aggregate([
        { $match: { tenantId: tenantObjectId } },
        { $group: { _id: null, totalSize: { $sum: '$size' } } },
      ]).option({ bypassTenantQuery: true }),
    ]);

    const totalBytes = (mediaRes[0]?.totalSize || 0) + (lockerRes[0]?.totalSize || 0);
    const limit = await this.getLimit(applicationId, 'storage_bytes');

    await UsageRecord.findOneAndUpdate(
      {
        applicationId: new mongoose.Types.ObjectId(applicationId),
        metric: 'storage_bytes',
        period: 'current',
      },
      {
        $set: {
          used: totalBytes,
          limit: typeof limit === 'number' ? limit : 524288000,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return totalBytes;
  }
}
