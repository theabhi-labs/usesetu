import mongoose from 'mongoose';
import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../config/logger';
import { Application, ApplicationStatus } from '../../models/application.model';
import { Plan, IPlan, PlanStatus } from '../../models/plan.model';
import { BillingCycle } from '../../models/subscription.model';
import { PaymentTransaction, PaymentTransactionStatus, IPaymentTransaction } from '../../models/paymentTransaction.model';
import { PaymentCustomer } from '../../models/paymentCustomer.model';
import { BillingInvoice, BillingInvoiceStatus } from '../../models/billingInvoice.model';
import { SubscriptionAuditLog } from '../../models/subscriptionAuditLog.model';
import { PlatformNotification, PlatformNotificationCategory, PlatformNotificationType } from '../../models/platformNotification.model';
import { SubscriptionService } from '../subscription.service';
import { RazorpayProvider } from './razorpay/razorpay.provider';
import { SubscriptionBillingPolicyService } from './subscriptionBillingPolicy.service';
import { NormalizedPaymentEvent } from './paymentProvider.interface';

export class PaymentService {
  private static provider = new RazorpayProvider();

  /**
   * 1. Create a server-side verified checkout order
   */
  static async createCheckout(params: {
    applicationId: string | mongoose.Types.ObjectId;
    planId: string | mongoose.Types.ObjectId;
    billingCycle: BillingCycle;
    actorId: string;
    customerEmail?: string;
    customerName?: string;
  }): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    razorpayKeyId: string;
    applicationId: string;
    planId: string;
    billingCycle: BillingCycle;
    planName: string;
    transactionId: string;
  }> {
    const appObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) {
      throw ApiError.notFound('Application not found');
    }

    if (app.status === ApplicationStatus.ARCHIVED) {
      throw ApiError.badRequest('Archived applications cannot be upgraded or billed');
    }

    const plan = await Plan.findById(params.planId);
    if (!plan || plan.status !== PlanStatus.ACTIVE) {
      throw ApiError.badRequest('Target plan not found or is inactive');
    }

    const currentSub = await SubscriptionService.getCurrentSubscription(app._id);
    const currentPlan = currentSub?.planId as unknown as IPlan;

    // Server-side evaluation of transition & amount (paise)
    const transition = SubscriptionBillingPolicyService.evaluateTransition(
      currentSub,
      currentPlan,
      plan,
      params.billingCycle,
    );

    if (transition.amount <= 0 && !transition.requiresPayment) {
      throw ApiError.badRequest('Selected plan change does not require payment. Please use direct plan change.');
    }

    // Customer mapping
    const customerEmail = params.customerEmail || `customer_${app.accountId}@usesetu.com`;
    const customerName = params.customerName || app.name;

    let paymentCustomer = await PaymentCustomer.findOne({
      accountId: app.accountId,
      applicationId: app._id,
      provider: 'razorpay',
    });

    if (!paymentCustomer) {
      try {
        const rzpCustomer = await this.provider.createCustomer({
          email: customerEmail,
          name: customerName,
          notes: {
            accountId: String(app.accountId),
            applicationId: String(app._id),
          },
        });

        paymentCustomer = await PaymentCustomer.create({
          accountId: app.accountId,
          applicationId: app._id,
          provider: 'razorpay',
          providerCustomerId: rzpCustomer.customerId,
          email: customerEmail,
          name: customerName,
          status: 'active',
        });
      } catch (err: any) {
        logger.warn(`Could not create customer in Razorpay, proceeding with order: ${err.message}`);
      }
    }

    const receipt = `rcpt_${app.slug.slice(0, 10)}_${Date.now()}`;

    // Create Razorpay Order
    const order = await this.provider.createOrder({
      amount: transition.amount,
      currency: transition.currency,
      receipt,
      notes: {
        accountId: String(app.accountId),
        applicationId: String(app._id),
        planId: String(plan._id),
        billingCycle: params.billingCycle,
        actorId: params.actorId,
      },
    });

    // Create Local PaymentTransaction
    const transaction = await PaymentTransaction.create({
      accountId: app.accountId,
      applicationId: app._id,
      subscriptionId: currentSub?._id,
      planId: plan._id,
      billingCycle: params.billingCycle,
      provider: 'razorpay',
      providerOrderId: order.orderId,
      amount: transition.amount,
      currency: transition.currency,
      status: PaymentTransactionStatus.CREATED,
      description: transition.description,
      metadata: {
        receipt,
        transitionType: transition.transitionType,
      },
    });

    await SubscriptionAuditLog.create({
      applicationId: app._id,
      accountId: app.accountId,
      actorId: new mongoose.Types.ObjectId(params.actorId),
      action: 'CHECKOUT_CREATED',
      newPlan: {
        id: plan._id as any,
        slug: plan.slug,
        name: plan.name,
      },
      reason: `Checkout initiated for ${plan.name} (${params.billingCycle})`,
      metadata: {
        orderId: order.orderId,
        amount: transition.amount,
        currency: transition.currency,
      },
    });

    return {
      orderId: order.orderId,
      amount: transition.amount,
      currency: transition.currency,
      razorpayKeyId: env.RAZORPAY_KEY_ID,
      applicationId: String(app._id),
      planId: String(plan._id),
      billingCycle: params.billingCycle,
      planName: plan.name,
      transactionId: String(transaction._id),
    };
  }

  /**
   * 2. Verify payment signature from checkout callback and activate subscription
   */
  static async verifyPayment(params: {
    applicationId: string | mongoose.Types.ObjectId;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    actorId: string;
  }): Promise<{
    success: boolean;
    transaction: IPaymentTransaction;
    subscription: any;
  }> {
    const appObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) throw ApiError.notFound('Application not found');

    // 1. Verify Cryptographic Signature
    const isValidSignature = this.provider.verifyPaymentSignature({
      orderId: params.razorpayOrderId,
      paymentId: params.razorpayPaymentId,
      signature: params.razorpaySignature,
    });

    if (!isValidSignature) {
      logger.warn(`Payment signature verification failed for order ${params.razorpayOrderId}`);
      throw ApiError.badRequest('Invalid payment signature');
    }

    // 2. Lookup local transaction
    const transaction = await PaymentTransaction.findOne({
      provider: 'razorpay',
      providerOrderId: params.razorpayOrderId,
      applicationId: app._id,
    });

    if (!transaction) {
      throw ApiError.notFound('Payment transaction not found for this order');
    }

    // Idempotency: If already captured, return existing authoritative state
    if (transaction.status === PaymentTransactionStatus.CAPTURED) {
      const currentSub = await SubscriptionService.getCurrentSubscription(app._id);
      return {
        success: true,
        transaction,
        subscription: currentSub,
      };
    }

    // 3. Fetch authoritative payment from provider
    const payment = await this.provider.fetchPayment(params.razorpayPaymentId);

    // Verify Amount & Currency
    if (payment.amount !== transaction.amount) {
      logger.error(`Amount mismatch for payment ${params.razorpayPaymentId}: expected ${transaction.amount}, got ${payment.amount}`);
      throw ApiError.badRequest('Payment amount does not match expected order amount');
    }

    if (payment.currency.toUpperCase() !== transaction.currency.toUpperCase()) {
      throw ApiError.badRequest('Payment currency mismatch');
    }

    // 4. Update Transaction
    transaction.providerPaymentId = params.razorpayPaymentId;
    transaction.status = PaymentTransactionStatus.CAPTURED;
    transaction.paidAt = new Date();
    transaction.method = payment.method;
    transaction.metadata = {
      ...(transaction.metadata || {}),
      signatureVerified: true,
      paymentDetails: {
        email: payment.email,
        contact: payment.contact,
        method: payment.method,
      },
    };
    await transaction.save();

    // 5. Create Billing Invoice Record
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await BillingInvoice.create({
      accountId: app.accountId,
      applicationId: app._id,
      paymentTransactionId: transaction._id,
      planId: transaction.planId,
      billingCycle: transaction.billingCycle,
      provider: 'razorpay',
      providerInvoiceId: (payment.raw as any)?.invoice_id || undefined,
      invoiceNumber,
      subtotal: transaction.amount,
      tax: 0,
      total: transaction.amount,
      currency: transaction.currency,
      status: BillingInvoiceStatus.PAID,
      paidAt: new Date(),
    });

    // 6. Authoritatively Activate / Upgrade Subscription
    const updatedSub = await SubscriptionService.activateFromPayment({
      applicationId: app._id,
      planId: transaction.planId,
      billingCycle: transaction.billingCycle,
      paymentTransactionId: transaction._id,
      provider: 'razorpay',
      providerPaymentId: params.razorpayPaymentId,
      providerOrderId: params.razorpayOrderId,
      actorId: params.actorId,
    });

    return {
      success: true,
      transaction,
      subscription: updatedSub,
    };
  }

  /**
   * 3. Ingest and handle Normalized Payment Event from Webhook
   */
  static async handleNormalizedPaymentEvent(event: NormalizedPaymentEvent): Promise<void> {
    logger.info(`Handling normalized payment event: ${event.eventType} for entity ${event.paymentId || event.orderId}`);

    // If orderId or paymentId is present, find matching transaction
    let transaction: IPaymentTransaction | null = null;
    if (event.orderId) {
      transaction = await PaymentTransaction.findOne({ provider: 'razorpay', providerOrderId: event.orderId });
    }
    if (!transaction && event.paymentId) {
      transaction = await PaymentTransaction.findOne({ provider: 'razorpay', providerPaymentId: event.paymentId });
    }

    switch (event.eventType) {
      case 'payment.captured':
      case 'order.paid': {
        if (transaction) {
          if (transaction.status !== PaymentTransactionStatus.CAPTURED) {
            transaction.status = PaymentTransactionStatus.CAPTURED;
            transaction.providerPaymentId = event.paymentId || transaction.providerPaymentId;
            transaction.paidAt = event.occurredAt || new Date();
            transaction.method = event.method || transaction.method;
            await transaction.save();

            // Activate subscription
            await SubscriptionService.activateFromPayment({
              applicationId: transaction.applicationId,
              planId: transaction.planId,
              billingCycle: transaction.billingCycle,
              paymentTransactionId: transaction._id,
              provider: 'razorpay',
              providerPaymentId: event.paymentId,
              providerOrderId: event.orderId,
            });
          }
        }
        break;
      }

      case 'payment.failed': {
        if (transaction && transaction.status !== PaymentTransactionStatus.CAPTURED) {
          transaction.status = PaymentTransactionStatus.FAILED;
          transaction.failedAt = event.occurredAt || new Date();
          transaction.failureReason = event.failureReason || 'Payment failed at provider';
          await transaction.save();

          await SubscriptionService.markPaymentFailed({
            applicationId: transaction.applicationId,
            failureReason: event.failureReason,
            providerPaymentId: event.paymentId,
          });
        }
        break;
      }

      case 'subscription.charged': {
        if (event.applicationId) {
          await SubscriptionService.renewFromPayment({
            applicationId: event.applicationId,
            providerPaymentId: event.paymentId,
            providerOrderId: event.orderId,
          });
        }
        break;
      }

      case 'refund.processed':
      case 'refund.created': {
        if (transaction) {
          const isFull = event.amount && event.amount >= transaction.amount;
          transaction.status = isFull
            ? PaymentTransactionStatus.REFUNDED
            : PaymentTransactionStatus.PARTIALLY_REFUNDED;
          transaction.refundedAt = event.occurredAt || new Date();
          transaction.refundAmount = (transaction.refundAmount || 0) + (event.amount || 0);
          await transaction.save();

          await SubscriptionAuditLog.create({
            applicationId: transaction.applicationId,
            accountId: transaction.accountId,
            action: 'REFUND_COMPLETED',
            reason: `Refund processed: ${event.paymentId}`,
            metadata: {
              amount: event.amount,
              currency: event.currency,
              paymentId: event.paymentId,
            },
          });
        }
        break;
      }

      default:
        logger.info(`No specific handler needed for webhook event: ${event.eventType}`);
    }
  }

  /**
   * 4. Refund a captured transaction
   */
  static async refundPayment(params: {
    applicationId: string | mongoose.Types.ObjectId;
    paymentId: string;
    amount?: number; // minor units (paise)
    reason?: string;
    actorId?: string;
  }): Promise<IPaymentTransaction> {
    const appObjectId = new mongoose.Types.ObjectId(params.applicationId);
    const app = await Application.findById(appObjectId);
    if (!app) throw ApiError.notFound('Application not found');

    const transaction = await PaymentTransaction.findOne({
      applicationId: app._id,
      $or: [{ providerPaymentId: params.paymentId }, { _id: mongoose.isValidObjectId(params.paymentId) ? params.paymentId : undefined }],
    });

    if (!transaction) {
      throw ApiError.notFound('Payment transaction not found for this application');
    }

    if (
      transaction.status !== PaymentTransactionStatus.CAPTURED &&
      transaction.status !== PaymentTransactionStatus.PARTIALLY_REFUNDED
    ) {
      throw ApiError.badRequest(`Cannot refund transaction with status: ${transaction.status}`);
    }

    const availableRefund = transaction.amount - (transaction.refundAmount || 0);
    if (params.amount && params.amount > availableRefund) {
      throw ApiError.badRequest(`Refund amount (${params.amount}) exceeds refundable balance (${availableRefund})`);
    }

    const refundAmountPaise = params.amount || availableRefund;

    // Call Razorpay Refund API
    const refundRes = await this.provider.refundPayment({
      paymentId: transaction.providerPaymentId!,
      amount: refundAmountPaise,
      notes: {
        reason: params.reason || 'User requested refund',
        applicationId: String(app._id),
      },
    });

    const newRefundTotal = (transaction.refundAmount || 0) + refundAmountPaise;
    transaction.refundAmount = newRefundTotal;
    transaction.status =
      newRefundTotal >= transaction.amount
        ? PaymentTransactionStatus.REFUNDED
        : PaymentTransactionStatus.PARTIALLY_REFUNDED;
    transaction.refundedAt = new Date();
    await transaction.save();

    await SubscriptionAuditLog.create({
      applicationId: app._id,
      accountId: app.accountId,
      actorId: params.actorId ? new mongoose.Types.ObjectId(params.actorId) : undefined,
      action: 'REFUND_COMPLETED',
      reason: params.reason || 'Refund processed',
      metadata: {
        refundId: refundRes.refundId,
        paymentId: transaction.providerPaymentId,
        amount: refundAmountPaise,
        currency: transaction.currency,
      },
    });

    await PlatformNotification.create({
      accountId: app.accountId,
      applicationId: app._id,
      category: PlatformNotificationCategory.SUBSCRIPTION,
      type: PlatformNotificationType.INFO,
      title: 'Refund Processed',
      message: `A refund of ₹${refundAmountPaise / 100} has been processed for "${app.name}".`,
      link: `/platform/applications/${app._id}?tab=billing`,
    });

    return transaction;
  }
}
