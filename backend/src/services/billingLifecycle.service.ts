import { env } from '../config/env';
import { logger } from '../config/logger';
import { Subscription, SubscriptionStatus } from '../models/subscription.model';
import { Application } from '../models/application.model';
import { PlatformNotification, PlatformNotificationCategory, PlatformNotificationType } from '../models/platformNotification.model';
import { SubscriptionService } from './subscription.service';

export interface BillingLifecycleReport {
  remindersSent: number;
  gracePeriodsStarted: number;
  subscriptionsExpired: number;
  dunningSent: number;
  timestamp: Date;
}

export class BillingLifecycleService {
  /**
   * 1. Process renewal and expiration reminders for upcoming subscription expirations (7d, 3d, 1d)
   */
  static async processRenewalReminders(): Promise<number> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find active subscriptions expiring within the next 7 days
    const upcomingSubs = await Subscription.find({
      status: SubscriptionStatus.ACTIVE,
      endsAt: { $gt: now, $lte: sevenDaysFromNow },
    });

    let remindersSent = 0;

    for (const sub of upcomingSubs) {
      if (!sub.endsAt) continue;

      const diffMs = sub.endsAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

      // Windows: 7 days, 3 days, 1 day
      let windowKey: string | null = null;
      if (daysRemaining === 7 || daysRemaining === 6) windowKey = '7d';
      else if (daysRemaining === 3 || daysRemaining === 2) windowKey = '3d';
      else if (daysRemaining === 1) windowKey = '1d';

      if (!windowKey) continue;

      const app = await Application.findById(sub.applicationId);
      if (!app) continue;

      // Deduplication check: verify if reminder for this window was already sent
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const existingNotification = await PlatformNotification.findOne({
        applicationId: app._id,
        category: PlatformNotificationCategory.SUBSCRIPTION,
        title: { $regex: new RegExp(`Renewal Reminder.*${windowKey}`, 'i') },
        createdAt: { $gte: oneDayAgo },
      });

      if (!existingNotification) {
        await PlatformNotification.create({
          accountId: app.accountId,
          applicationId: app._id,
          category: PlatformNotificationCategory.SUBSCRIPTION,
          type: daysRemaining <= 1 ? PlatformNotificationType.WARNING : PlatformNotificationType.INFO,
          title: `Subscription Renewal Reminder (${windowKey}): ${sub.planSnapshot?.name || 'Plan'}`,
          message: `Your subscription for "${app.name}" will renew or expire in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} on ${sub.endsAt.toLocaleDateString()}. Please ensure payment details are updated.`,
          link: `/platform/applications/${app._id}?tab=billing`,
        });
        remindersSent += 1;
      }
    }

    return remindersSent;
  }

  /**
   * 2. Process subscriptions past endsAt -> initiate grace period, or past gracePeriodEndsAt -> expire
   */
  static async processGracePeriodsAndExpirations(): Promise<{
    gracePeriodsStarted: number;
    subscriptionsExpired: number;
  }> {
    const now = new Date();
    let gracePeriodsStarted = 0;
    let subscriptionsExpired = 0;

    // Step A: Move past-due active subscriptions into grace period
    const expiredActiveSubs = await Subscription.find({
      status: SubscriptionStatus.ACTIVE,
      endsAt: { $lt: now },
    });

    for (const sub of expiredActiveSubs) {
      await SubscriptionService.markPaymentFailed({
        applicationId: sub.applicationId,
        failureReason: 'Subscription period ended without automatic renewal payment',
        gracePeriodDays: env.BILLING_GRACE_PERIOD_DAYS ?? 7,
      });
      gracePeriodsStarted += 1;
    }

    // Step B: Expire PAST_DUE subscriptions where grace period has ended
    const expiredGraceSubs = await Subscription.find({
      status: SubscriptionStatus.PAST_DUE,
      gracePeriodEndsAt: { $lt: now },
    });

    for (const sub of expiredGraceSubs) {
      await SubscriptionService.expireSubscription({
        applicationId: sub.applicationId,
        reason: 'Grace period elapsed without payment recovery',
      });
      subscriptionsExpired += 1;
    }

    return {
      gracePeriodsStarted,
      subscriptionsExpired,
    };
  }

  /**
   * 3. Send dunning notices to subscriptions currently in grace period
   */
  static async processDunningReminders(): Promise<number> {
    const now = new Date();
    const pastDueSubs = await Subscription.find({
      status: SubscriptionStatus.PAST_DUE,
      gracePeriodEndsAt: { $gt: now },
    });

    let dunningSent = 0;

    for (const sub of pastDueSubs) {
      if (!sub.gracePeriodEndsAt) continue;

      const app = await Application.findById(sub.applicationId);
      if (!app) continue;

      const diffMs = sub.gracePeriodEndsAt.getTime() - now.getTime();
      const daysRemaining = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

      // Deduplication: send at most once per 24 hours
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const existingDunning = await PlatformNotification.findOne({
        applicationId: app._id,
        category: PlatformNotificationCategory.SUBSCRIPTION,
        title: { $regex: 'Urgent: Payment Required (Grace Period Active)', $options: 'i' },
        createdAt: { $gte: oneDayAgo },
      });

      if (!existingDunning) {
        await PlatformNotification.create({
          accountId: app.accountId,
          applicationId: app._id,
          category: PlatformNotificationCategory.SUBSCRIPTION,
          type: PlatformNotificationType.ERROR,
          title: 'Urgent: Payment Required (Grace Period Active)',
          message: `Your center "${app.name}" is currently in a grace period with ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining. Renew your plan now to prevent fallback to free limits.`,
          link: `/platform/applications/${app._id}?tab=billing`,
        });
        dunningSent += 1;
      }
    }

    return dunningSent;
  }

  /**
   * 4. Single entry point for running the complete automated billing lifecycle
   */
  static async runAutomatedLifecycleCycle(): Promise<BillingLifecycleReport> {
    logger.info('Starting automated billing lifecycle cycle...');

    const remindersSent = await this.processRenewalReminders();
    const { gracePeriodsStarted, subscriptionsExpired } = await this.processGracePeriodsAndExpirations();
    const dunningSent = await this.processDunningReminders();

    const report: BillingLifecycleReport = {
      remindersSent,
      gracePeriodsStarted,
      subscriptionsExpired,
      dunningSent,
      timestamp: new Date(),
    };

    logger.info(
      `Billing lifecycle cycle completed: ${remindersSent} reminders, ${gracePeriodsStarted} grace periods started, ${subscriptionsExpired} expired, ${dunningSent} dunning notices sent.`,
      report,
    );

    return report;
  }
}
