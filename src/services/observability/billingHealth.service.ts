import { PaymentTransaction } from '../../models/paymentTransaction.model';
import { PaymentWebhookEvent } from '../../models/paymentWebhookEvent.model';
import { Subscription } from '../../models/subscription.model';
import { SubscriptionAuditLog } from '../../models/subscriptionAuditLog.model';

export interface BillingHealthReport {
  summary: {
    totalTransactions: number;
    capturedCount: number;
    failedCount: number;
    refundedCount: number;
    pendingCount: number;
    paymentSuccessRate: number;
    totalVolumeINR: number;
  };
  webhooks: {
    totalEvents: number;
    processedCount: number;
    failedCount: number;
    ignoredCount: number;
    duplicateCount: number;
    webhookSuccessRate: number;
  };
  subscriptions: {
    totalActive: number;
    totalTrialing: number;
    totalPastDue: number;
    totalExpired: number;
    totalCancelled: number;
    inGracePeriodCount: number;
  };
  reconciliation: {
    recentReconciliationEvents: number;
    recoveredCount: number;
  };
  timestamp: string;
}

export class BillingHealthService {
  /**
   * Aggregates billing, webhook, and subscription health across the platform.
   */
  static async getBillingHealth(): Promise<BillingHealthReport> {
    const [
      txTotal,
      txCaptured,
      txFailed,
      txRefunded,
      txPending,
      volumeAgg,
      whTotal,
      whProcessed,
      whFailed,
      whIgnored,
      whDuplicate,
      subActive,
      subTrialing,
      subPastDue,
      subExpired,
      subCancelled,
      reconcileCount,
      recoveredCount,
    ] = await Promise.all([
      PaymentTransaction.countDocuments(),
      PaymentTransaction.countDocuments({ status: 'CAPTURED' }),
      PaymentTransaction.countDocuments({ status: 'FAILED' }),
      PaymentTransaction.countDocuments({ status: { $in: ['REFUNDED', 'PARTIALLY_REFUNDED'] } }),
      PaymentTransaction.countDocuments({ status: { $in: ['CREATED', 'AUTHORIZED'] } }),
      PaymentTransaction.aggregate([
        { $match: { status: 'CAPTURED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PaymentWebhookEvent.countDocuments(),
      PaymentWebhookEvent.countDocuments({ status: 'PROCESSED' }),
      PaymentWebhookEvent.countDocuments({ status: 'FAILED' }),
      PaymentWebhookEvent.countDocuments({ status: 'IGNORED' }),
      PaymentWebhookEvent.countDocuments({ status: 'DUPLICATE' }),
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'trialing' }),
      Subscription.countDocuments({ status: 'past_due' }),
      Subscription.countDocuments({ status: 'expired' }),
      Subscription.countDocuments({ status: 'cancelled' }),
      SubscriptionAuditLog.countDocuments({ action: 'RECONCILIATION_SYNC' }),
      SubscriptionAuditLog.countDocuments({ action: 'SUBSCRIPTION_RECOVERED' }),
    ]);

    const resolvedTx = txCaptured + txFailed;
    const paymentSuccessRate = resolvedTx > 0 ? Math.round((txCaptured / resolvedTx) * 10000) / 100 : 100;
    const webhookResolved = whProcessed + whFailed;
    const webhookSuccessRate = webhookResolved > 0 ? Math.round((whProcessed / webhookResolved) * 10000) / 100 : 100;
    const totalVolumeINR = volumeAgg.length > 0 ? volumeAgg[0].total / 100 : 0;

    return {
      summary: {
        totalTransactions: txTotal,
        capturedCount: txCaptured,
        failedCount: txFailed,
        refundedCount: txRefunded,
        pendingCount: txPending,
        paymentSuccessRate,
        totalVolumeINR,
      },
      webhooks: {
        totalEvents: whTotal,
        processedCount: whProcessed,
        failedCount: whFailed,
        ignoredCount: whIgnored,
        duplicateCount: whDuplicate,
        webhookSuccessRate,
      },
      subscriptions: {
        totalActive: subActive,
        totalTrialing: subTrialing,
        totalPastDue: subPastDue,
        totalExpired: subExpired,
        totalCancelled: subCancelled,
        inGracePeriodCount: subPastDue,
      },
      reconciliation: {
        recentReconciliationEvents: reconcileCount,
        recoveredCount,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
