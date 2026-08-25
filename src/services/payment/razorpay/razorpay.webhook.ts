import crypto from 'crypto';
import { env } from '../../../config/env';
import { ApiError } from '../../../utils/ApiError';
import { logger } from '../../../config/logger';
import { PaymentWebhookEvent, WebhookEventStatus } from '../../../models/paymentWebhookEvent.model';
import { RazorpayProvider } from './razorpay.provider';
import { RazorpayMapper } from './razorpay.mapper';
import { RazorpayWebhookPayload } from './razorpay.types';

export class RazorpayWebhookHandler {
  private static provider = new RazorpayProvider();

  /**
   * Process raw webhook request safely and idempotently
   */
  static async handleWebhook(params: {
    rawBody: string | Buffer;
    signature: string;
    headers?: Record<string, any>;
  }): Promise<{ success: boolean; eventId: string; duplicate?: boolean }> {
    const { rawBody, signature, headers } = params;

    // 1. Verify Signature
    const isValid = this.provider.verifyWebhookSignature({
      rawBody,
      signature,
      secret: env.RAZORPAY_WEBHOOK_SECRET,
    });

    if (!isValid) {
      logger.warn('Razorpay webhook signature verification failed');
      throw ApiError.unauthorized('Invalid webhook signature');
    }

    // 2. Parse payload & compute hash
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const payloadHash = crypto.createHash('sha256').update(bodyStr).digest('hex');

    let parsedPayload: RazorpayWebhookPayload;
    try {
      parsedPayload = JSON.parse(bodyStr);
    } catch {
      throw ApiError.badRequest('Invalid JSON payload in webhook');
    }

    // Identify Event ID
    const rawEventId =
      headers?.['x-razorpay-event-id'] ||
      (parsedPayload as any)?.event_id ||
      (parsedPayload as any)?.id ||
      `evt_${payloadHash.slice(0, 16)}`;

    // 3. Idempotency Check
    let webhookEvent = await PaymentWebhookEvent.findOne({
      provider: 'razorpay',
      eventId: rawEventId,
    });

    if (webhookEvent) {
      if (webhookEvent.status === WebhookEventStatus.PROCESSED) {
        logger.info(`Webhook event already processed (idempotent): ${rawEventId}`);
        return { success: true, eventId: rawEventId, duplicate: true };
      }
      if (webhookEvent.status === WebhookEventStatus.PROCESSING) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (webhookEvent.receivedAt > fiveMinutesAgo) {
          logger.info(`Webhook event currently processing: ${rawEventId}`);
          return { success: true, eventId: rawEventId, duplicate: true };
        }
      }
    } else {
      webhookEvent = await PaymentWebhookEvent.create({
        provider: 'razorpay',
        eventId: rawEventId,
        eventType: parsedPayload.event,
        payloadHash,
        status: WebhookEventStatus.PROCESSING,
        payload: parsedPayload,
        headers,
      });
    }

    // 4. Normalize Event & Process
    try {
      const normalizedEvent = RazorpayMapper.mapWebhookEvent(parsedPayload, rawEventId);

      // Lazy load PaymentService to avoid circular dependency
      const { PaymentService } = await import('../payment.service');
      await PaymentService.handleNormalizedPaymentEvent(normalizedEvent);

      webhookEvent.status = WebhookEventStatus.PROCESSED;
      webhookEvent.processedAt = new Date();
      webhookEvent.applicationId = normalizedEvent.applicationId ? (normalizedEvent.applicationId as any) : undefined;
      webhookEvent.accountId = normalizedEvent.accountId ? (normalizedEvent.accountId as any) : undefined;
      webhookEvent.providerEntityId = normalizedEvent.paymentId || normalizedEvent.orderId;
      await webhookEvent.save();

      return { success: true, eventId: rawEventId };
    } catch (err: any) {
      logger.error(`Error processing Razorpay webhook ${rawEventId}: ${err.message}`, { error: err });
      webhookEvent.status = WebhookEventStatus.FAILED;
      webhookEvent.lastError = err.message;
      webhookEvent.processingAttempts += 1;
      await webhookEvent.save();
      throw err;
    }
  }
}
