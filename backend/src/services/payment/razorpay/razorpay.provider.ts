import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../../../config/env';
import { ApiError } from '../../../utils/ApiError';
import {
  IPaymentProvider,
  ProviderCapabilities,
  CreateCustomerInput,
  CreateCustomerResult,
  CreateOrderInput,
  CreateOrderResult,
  FetchPaymentResult,
  CapturePaymentInput,
  RefundPaymentInput,
  RefundPaymentResult,
  CreateSubscriptionInput,
  CreateSubscriptionResult,
  VerifyPaymentSignatureInput,
  VerifyWebhookSignatureInput,
  NormalizedPaymentEvent,
} from '../paymentProvider.interface';
import { RazorpayMapper } from './razorpay.mapper';
import { RazorpayPaymentEntity, RazorpayRefundEntity } from './razorpay.types';

export class RazorpayProvider implements IPaymentProvider {
  readonly providerName = 'razorpay';
  private razorpayClient: Razorpay;

  readonly capabilities: ProviderCapabilities = {
    supportsRecurringBilling: true,
    supportsRefunds: true,
    supportsInvoices: true,
    supportsSubscriptions: true,
    supportsPartialRefunds: true,
  };

  constructor(keyId?: string, keySecret?: string) {
    const activeKeyId = keyId || env.RAZORPAY_KEY_ID;
    const activeKeySecret = keySecret || env.RAZORPAY_KEY_SECRET;

    this.razorpayClient = new Razorpay({
      key_id: activeKeyId,
      key_secret: activeKeySecret,
    });
  }

  /**
   * Create a customer profile in Razorpay
   */
  async createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult> {
    try {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.startsWith('rzp_test_placeholder')) {
        return {
          customerId: `cust_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          email: input.email,
          name: input.name,
        };
      }

      const customer = await this.razorpayClient.customers.create({
        name: input.name,
        email: input.email,
        contact: input.contact,
        notes: input.notes,
      });

      return {
        customerId: customer.id,
        email: customer.email || input.email || '',
        name: customer.name || input.name || '',
      };
    } catch (error: any) {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.startsWith('rzp_test_placeholder')) {
        return {
          customerId: `cust_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          email: input.email,
          name: input.name,
        };
      }
      throw ApiError.badRequest(`Razorpay customer creation failed: ${error?.error?.description || error.message}`);
    }
  }

  /**
   * Create an order in Razorpay (amount in paise)
   */
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    try {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.startsWith('rzp_test_placeholder')) {
        const orderId = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          orderId,
          amount: input.amount,
          currency: input.currency || 'INR',
          receipt: input.receipt,
          status: 'created',
          raw: { id: orderId, amount: input.amount, status: 'created' },
        };
      }

      const order = await this.razorpayClient.orders.create({
        amount: input.amount,
        currency: input.currency || 'INR',
        receipt: input.receipt,
        notes: input.notes,
      });

      return {
        orderId: order.id,
        amount: Number(order.amount),
        currency: order.currency,
        receipt: order.receipt || input.receipt,
        status: order.status,
        raw: order,
      };
    } catch (error: any) {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.startsWith('rzp_test_placeholder')) {
        const orderId = `order_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
        return {
          orderId,
          amount: input.amount,
          currency: input.currency || 'INR',
          receipt: input.receipt,
          status: 'created',
          raw: { id: orderId, amount: input.amount, status: 'created' },
        };
      }
      throw ApiError.badRequest(`Razorpay order creation failed: ${error?.error?.description || error.message}`);
    }
  }

  /**
   * Fetch payment details from Razorpay
   */
  async fetchPayment(paymentId: string): Promise<FetchPaymentResult> {
    try {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.startsWith('rzp_test_placeholder')) {
        return {
          paymentId,
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          captured: true,
          createdAt: Math.floor(Date.now() / 1000),
        };
      }

      const payment = (await this.razorpayClient.payments.fetch(paymentId)) as unknown as RazorpayPaymentEntity;

      return {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        failureReason: payment.error_description || payment.error_reason || undefined,
        captured: payment.captured || payment.status === 'captured',
        createdAt: payment.created_at,
        raw: payment,
      };
    } catch (error: any) {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.startsWith('rzp_test_placeholder')) {
        return {
          paymentId,
          amount: 49900,
          currency: 'INR',
          status: 'captured',
          captured: true,
          createdAt: Math.floor(Date.now() / 1000),
        };
      }
      throw ApiError.badRequest(`Razorpay payment fetch failed: ${error?.error?.description || error.message}`);
    }
  }

  /**
   * Explicitly capture authorized payment
   */
  async capturePayment(input: CapturePaymentInput): Promise<FetchPaymentResult> {
    try {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.startsWith('rzp_test_placeholder')) {
        return {
          paymentId: input.paymentId,
          amount: input.amount,
          currency: input.currency || 'INR',
          status: 'captured',
          captured: true,
          createdAt: Math.floor(Date.now() / 1000),
        };
      }

      const payment = (await this.razorpayClient.payments.capture(
        input.paymentId,
        input.amount,
        input.currency || 'INR',
      )) as unknown as RazorpayPaymentEntity;

      return {
        paymentId: payment.id,
        orderId: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        captured: payment.captured || payment.status === 'captured',
        createdAt: payment.created_at,
        raw: payment,
      };
    } catch (error: any) {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.startsWith('rzp_test_placeholder')) {
        return {
          paymentId: input.paymentId,
          amount: input.amount,
          currency: input.currency || 'INR',
          status: 'captured',
          captured: true,
          createdAt: Math.floor(Date.now() / 1000),
        };
      }
      throw ApiError.badRequest(`Razorpay payment capture failed: ${error?.error?.description || error.message}`);
    }
  }

  /**
   * Initiate a full or partial refund
   */
  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
    try {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.startsWith('rzp_test_placeholder')) {
        return {
          refundId: `rfnd_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          paymentId: input.paymentId,
          amount: input.amount || 0,
          currency: 'INR',
          status: 'processed',
        };
      }

      const refundParams: any = {
        notes: input.notes,
        speed: input.speed || 'normal',
      };
      if (typeof input.amount === 'number' && input.amount > 0) {
        refundParams.amount = input.amount;
      }

      const refund = (await this.razorpayClient.payments.refund(
        input.paymentId,
        refundParams,
      )) as unknown as RazorpayRefundEntity;

      return {
        refundId: refund.id,
        paymentId: refund.payment_id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        raw: refund,
      };
    } catch (error: any) {
      throw ApiError.badRequest(`Razorpay refund failed: ${error?.error?.description || error.message}`);
    }
  }

  /**
   * Create recurring subscription in Razorpay (Mode B)
   */
  async createSubscription(input: CreateSubscriptionInput): Promise<CreateSubscriptionResult> {
    try {
      const sub = (await this.razorpayClient.subscriptions.create({
        plan_id: input.planId,
        total_count: input.totalCount || 12,
        quantity: input.quantity || 1,
        customer_notify: input.customerNotify ?? 1,
        start_at: input.startAt,
        notes: input.notes,
      })) as any;

      return {
        subscriptionId: sub.id,
        planId: sub.plan_id,
        status: sub.status,
        currentStart: sub.current_start,
        currentEnd: sub.current_end,
        raw: sub,
      };
    } catch (error: any) {
      throw ApiError.badRequest(`Razorpay subscription creation failed: ${error?.error?.description || error.message}`);
    }
  }

  /**
   * Cancel subscription in Razorpay
   */
  async cancelSubscription(providerSubscriptionId: string): Promise<{ success: boolean; raw?: any }> {
    try {
      const res = await this.razorpayClient.subscriptions.cancel(providerSubscriptionId, false);
      return { success: true, raw: res };
    } catch (error: any) {
      throw ApiError.badRequest(`Razorpay subscription cancellation failed: ${error?.error?.description || error.message}`);
    }
  }

  /**
   * Verify frontend checkout payment signature: HMAC_SHA256(order_id + "|" + payment_id, secret)
   */
  verifyPaymentSignature(input: VerifyPaymentSignatureInput): boolean {
    if (!input.orderId || !input.paymentId || !input.signature) {
      return false;
    }

    try {
      const secret = env.RAZORPAY_KEY_SECRET;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${input.orderId}|${input.paymentId}`)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const receivedBuf = Buffer.from(input.signature, 'utf8');

      if (expectedBuf.length !== receivedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Verify webhook signature: HMAC_SHA256(raw_body, webhook_secret)
   */
  verifyWebhookSignature(input: VerifyWebhookSignatureInput): boolean {
    if (!input.rawBody || !input.signature) {
      return false;
    }

    try {
      const secret = input.secret || env.RAZORPAY_WEBHOOK_SECRET;
      const bodyString = typeof input.rawBody === 'string' ? input.rawBody : input.rawBody.toString('utf8');

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(bodyString)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const receivedBuf = Buffer.from(input.signature, 'utf8');

      if (expectedBuf.length !== receivedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  /**
   * Normalize webhook event
   */
  normalizeWebhookEvent(rawEvent: any): NormalizedPaymentEvent {
    return RazorpayMapper.mapWebhookEvent(rawEvent);
  }
}
