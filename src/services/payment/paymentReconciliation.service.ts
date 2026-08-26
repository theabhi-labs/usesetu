import mongoose from 'mongoose';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { PaymentTransaction, PaymentTransactionStatus } from '../../models/paymentTransaction.model';
import { SubscriptionService } from '../subscription.service';
import { RazorpayProvider } from './razorpay/razorpay.provider';

export interface ReconciliationReport {
  transactionId?: string;
  providerPaymentId?: string;
  oldStatus?: string;
  newStatus?: string;
  synced: boolean;
  message: string;
}

export class PaymentReconciliationService {
  private static provider = new RazorpayProvider();

  /**
   * Reconcile a single payment transaction with provider state
   */
  static async reconcilePayment(paymentIdOrTransactionId: string): Promise<ReconciliationReport> {
    const transaction = await PaymentTransaction.findOne({
      $or: [
        { providerPaymentId: paymentIdOrTransactionId },
        { _id: mongoose.isValidObjectId(paymentIdOrTransactionId) ? paymentIdOrTransactionId : undefined },
        { providerOrderId: paymentIdOrTransactionId },
      ],
    });

    if (!transaction || !transaction.providerPaymentId) {
      return {
        synced: false,
        message: 'Transaction or providerPaymentId not found locally',
      };
    }

    try {
      const providerPayment = await this.provider.fetchPayment(transaction.providerPaymentId);
      const oldStatus = transaction.status;

      if (providerPayment.captured && transaction.status !== PaymentTransactionStatus.CAPTURED) {
        transaction.status = PaymentTransactionStatus.CAPTURED;
        transaction.paidAt = new Date(providerPayment.createdAt * 1000);
        transaction.method = providerPayment.method;
        await transaction.save();

        await SubscriptionService.activateFromPayment({
          applicationId: transaction.applicationId,
          planId: transaction.planId,
          billingCycle: transaction.billingCycle,
          paymentTransactionId: transaction._id,
          provider: 'razorpay',
          providerPaymentId: transaction.providerPaymentId,
          providerOrderId: transaction.providerOrderId,
        });

        return {
          transactionId: String(transaction._id),
          providerPaymentId: transaction.providerPaymentId,
          oldStatus,
          newStatus: PaymentTransactionStatus.CAPTURED,
          synced: true,
          message: 'Payment was captured at provider; updated local state and activated subscription',
        };
      }

      if (providerPayment.status === 'failed' && transaction.status !== PaymentTransactionStatus.FAILED) {
        transaction.status = PaymentTransactionStatus.FAILED;
        transaction.failureReason = providerPayment.failureReason || 'Failed at provider';
        await transaction.save();

        await SubscriptionService.markPaymentFailed({
          applicationId: transaction.applicationId,
          failureReason: transaction.failureReason,
          providerPaymentId: transaction.providerPaymentId,
        });

        return {
          transactionId: String(transaction._id),
          providerPaymentId: transaction.providerPaymentId,
          oldStatus,
          newStatus: PaymentTransactionStatus.FAILED,
          synced: true,
          message: 'Payment failed at provider; updated local state',
        };
      }

      return {
        transactionId: String(transaction._id),
        providerPaymentId: transaction.providerPaymentId,
        oldStatus,
        newStatus: transaction.status,
        synced: true,
        message: 'Transaction is already in sync with provider',
      };
    } catch (err: any) {
      logger.error(`Reconciliation error for ${paymentIdOrTransactionId}: ${err.message}`);
      return {
        transactionId: String(transaction._id),
        providerPaymentId: transaction.providerPaymentId,
        synced: false,
        message: `Failed to communicate with provider: ${err.message}`,
      };
    }
  }

  /**
   * Reconcile all pending transactions for an application and sync quotas
   */
  static async reconcileApplicationBilling(applicationId: string | mongoose.Types.ObjectId): Promise<ReconciliationReport[]> {
    const appObjectId = new mongoose.Types.ObjectId(applicationId);
    const pendingTransactions = await PaymentTransaction.find({
      applicationId: appObjectId,
      status: { $in: [PaymentTransactionStatus.CREATED, PaymentTransactionStatus.AUTHORIZED] },
      $or: [
        { providerPaymentId: { $exists: true, $ne: null } },
        { providerOrderId: { $exists: true, $ne: null } },
      ],
    });

    const reports: ReconciliationReport[] = [];
    for (const tx of pendingTransactions) {
      const identifier = tx.providerPaymentId || tx.providerOrderId;
      if (identifier) {
        const report = await this.reconcilePayment(identifier);
        reports.push(report);
      }
    }

    // Sync quotas as part of application reconciliation
    await SubscriptionService.syncApplicationQuotas(appObjectId);

    return reports;
  }

  /**
   * Batch sweep reconciliation for all pending transactions across the platform
   */
  static async runScheduledReconciliation(): Promise<{
    scanned: number;
    synced: number;
    reports: ReconciliationReport[];
  }> {
    const staleMinutes = env.BILLING_RECONCILIATION_STALE_MINUTES ?? 15;
    const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
    const staleTransactions = await PaymentTransaction.find({
      status: { $in: [PaymentTransactionStatus.CREATED, PaymentTransactionStatus.AUTHORIZED] },
      createdAt: { $lte: staleCutoff },
      $or: [
        { providerPaymentId: { $exists: true, $ne: null } },
        { providerOrderId: { $exists: true, $ne: null } },
      ],
    }).limit(100);

    const reports: ReconciliationReport[] = [];
    let syncedCount = 0;

    for (const tx of staleTransactions) {
      const identifier = tx.providerPaymentId || tx.providerOrderId;
      if (identifier) {
        const report = await this.reconcilePayment(identifier);
        reports.push(report);
        if (report.synced) {
          syncedCount += 1;
        }
      }
    }

    return {
      scanned: staleTransactions.length,
      synced: syncedCount,
      reports,
    };
  }
}
