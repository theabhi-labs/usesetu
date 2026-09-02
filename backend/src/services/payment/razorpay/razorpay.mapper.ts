import { NormalizedPaymentEvent } from '../paymentProvider.interface';
import { RazorpayWebhookPayload } from './razorpay.types';

export class RazorpayMapper {
  /**
   * Map raw Razorpay webhook payload into NormalizedPaymentEvent
   */
  static mapWebhookEvent(rawPayload: RazorpayWebhookPayload, eventId?: string): NormalizedPaymentEvent {
    const eventType = rawPayload.event;
    const paymentEntity = rawPayload.payload?.payment?.entity;
    const orderEntity = rawPayload.payload?.order?.entity;
    const refundEntity = rawPayload.payload?.refund?.entity;
    const subscriptionEntity = rawPayload.payload?.subscription?.entity;
    const invoiceEntity = rawPayload.payload?.invoice?.entity;

    // Extract notes from primary entity available
    const notes =
      paymentEntity?.notes ||
      orderEntity?.notes ||
      subscriptionEntity?.notes ||
      invoiceEntity?.notes ||
      refundEntity?.notes ||
      {};

    const applicationId = notes.applicationId || notes.application_id;
    const accountId = notes.accountId || notes.account_id;
    const planId = notes.planId || notes.plan_id;
    const billingCycle = notes.billingCycle || notes.billing_cycle;

    const paymentId = paymentEntity?.id || refundEntity?.payment_id;
    const orderId = paymentEntity?.order_id || orderEntity?.id;
    const subscriptionId = subscriptionEntity?.id || (paymentEntity as any)?.subscription_id;
    const invoiceId = invoiceEntity?.id || paymentEntity?.invoice_id;

    let amount = paymentEntity?.amount ?? orderEntity?.amount ?? refundEntity?.amount ?? 0;
    const currency = paymentEntity?.currency || orderEntity?.currency || refundEntity?.currency || 'INR';

    let status = 'unknown';
    let failureReason: string | undefined;

    switch (eventType) {
      case 'payment.captured':
        status = 'captured';
        break;
      case 'payment.authorized':
        status = 'authorized';
        break;
      case 'payment.failed':
        status = 'failed';
        failureReason = paymentEntity?.error_description || paymentEntity?.error_reason || 'Payment failed at provider';
        break;
      case 'order.paid':
        status = 'captured';
        break;
      case 'refund.processed':
      case 'refund.created':
        status = 'refunded';
        amount = refundEntity?.amount ?? amount;
        break;
      case 'subscription.charged':
        status = 'captured';
        break;
      case 'subscription.activated':
        status = 'active';
        break;
      case 'subscription.cancelled':
        status = 'cancelled';
        break;
      case 'subscription.halted':
      case 'subscription.pending':
        status = 'past_due';
        break;
      case 'invoice.paid':
        status = 'captured';
        break;
      default:
        status = paymentEntity?.status || 'received';
    }

    const occurredAt = rawPayload.created_at ? new Date(rawPayload.created_at * 1000) : new Date();

    return {
      provider: 'razorpay',
      eventId: eventId || `rzp_evt_${eventType}_${paymentId || orderId || subscriptionId || Date.now()}`,
      eventType,
      paymentId,
      orderId,
      subscriptionId,
      invoiceId: invoiceId || undefined,
      amount,
      currency,
      status,
      method: paymentEntity?.method,
      failureReason,
      applicationId,
      accountId,
      planId,
      billingCycle,
      occurredAt,
      rawReference: rawPayload,
    };
  }
}
