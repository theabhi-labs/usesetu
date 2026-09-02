import mongoose from 'mongoose';
import { Payment, PaymentStatus, PaymentType, PaymentMethod } from '../models/payment.model';
import { Refund, RefundStatus } from '../models/refund.model';
import { Receipt } from '../models/receipt.model';
import { Invoice } from '../models/invoice.model';
import { Request as RequestModel, PaymentSummaryStatus } from '../models/request.model';
import { Service } from '../models/service.model';
import { RequestActivity } from '../models/requestActivity.model';
import { generateReceiptNumber, generateInvoiceNumber } from './billingNumber.service';
import { emitEvent } from './eventBus.service';
import { ApiError } from '../utils/ApiError';

const deriveSummaryStatus = (totalAmount: number, paidAmount: number): PaymentSummaryStatus => {
  if (paidAmount <= 0) return PaymentSummaryStatus.PENDING;
  if (paidAmount >= totalAmount) return PaymentSummaryStatus.PAID;
  return PaymentSummaryStatus.PARTIAL;
};

interface RecordPaymentInput {
  requestId: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  amount: number;
  transactionId?: string;
  remarks?: string;
}

/**
 * Records a payment against a request and atomically keeps
 * Request.paymentSummary in sync — both writes commit together or neither
 * does, so the denormalized summary (used everywhere for fast list
 * filtering) can never drift from the Payment ledger, which is the source
 * of truth.
 */
export const recordPayment = async (input: RecordPaymentInput, actorId: string) => {
  const session = await mongoose.startSession();
  try {
    let result: { payment: unknown; receipt: unknown } | undefined;

    await session.withTransaction(async () => {
      const request = await RequestModel.findById(input.requestId).session(session);
      if (!request) throw ApiError.notFound('Request not found');

      const service = await Service.findById(request.service).session(session);
      if (!service) throw ApiError.badRequest('Service no longer exists');

      if (input.paymentType === PaymentType.PARTIAL && !service.paymentSettings.allowPartialPayment) {
        throw ApiError.badRequest('Partial payment is not allowed for this service');
      }
      if (input.paymentType === PaymentType.FULL && !service.paymentSettings.allowFullPayment) {
        throw ApiError.badRequest('Full payment is not allowed for this service');
      }

      const remainingBalance = request.paymentSummary.totalAmount - request.paymentSummary.paidAmount;
      if (input.amount > remainingBalance) {
        throw ApiError.badRequest(
          `Payment amount (Rs.${input.amount}) exceeds the remaining balance (Rs.${remainingBalance})`,
        );
      }
      if (input.amount <= 0) throw ApiError.badRequest('Payment amount must be greater than zero');

      const [payment] = await Payment.create(
        [
          {
            request: request._id,
            customer: request.customer,
            service: service._id,
            paymentType: input.paymentType,
            paymentMethod: input.paymentMethod,
            amount: input.amount,
            status: PaymentStatus.SUCCESS,
            transactionId: input.transactionId,
            remarks: input.remarks,
            verifiedBy: actorId,
            createdBy: actorId,
          },
        ],
        { session },
      );

      const newPaidAmount = request.paymentSummary.paidAmount + input.amount;
      request.paymentSummary.paidAmount = newPaidAmount;
      request.paymentSummary.status = deriveSummaryStatus(request.paymentSummary.totalAmount, newPaidAmount);
      await request.save({ session });

      const receiptNumber = await generateReceiptNumber();
      const [receipt] = await Receipt.create(
        [
          {
            receiptNumber,
            payment: payment._id,
            request: request._id,
            customer: request.customer,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            balanceAfterPayment: request.paymentSummary.totalAmount - newPaidAmount,
          },
        ],
        { session },
      );

      await Invoice.updateOne(
        { request: request._id },
        { status: request.paymentSummary.status },
        { session },
      );

      await RequestActivity.create(
        [
          {
            request: request._id,
            action: 'PAYMENT_RECORDED',
            performedBy: actorId,
            performedByRole: 'system',
            description: `${input.paymentType} payment of Rs.${input.amount} via ${input.paymentMethod}`,
          },
        ],
        { session },
      );

      result = { payment, receipt };
    });

    if (result) {
      const paymentDoc = result.payment as { request: unknown; amount: number };
      // Re-fetch minimal customer/application context for the event payload
      // rather than threading it through the transaction closure — keeps
      // the transaction itself focused purely on the write path.
      const request = await RequestModel.findById(input.requestId).select('customer applicationNumber customerName');
      if (request) {
        emitEvent('payment.received', {
          userId: String(request.customer),
          requestId: input.requestId,
          applicationNumber: request.applicationNumber,
          customerName: request.customerName,
          amount: paymentDoc.amount,
        });
      }
    }

    return result!;
  } finally {
    session.endSession();
  }
};

/**
 * Processes a refund against an existing payment. Validates the refund
 * amount doesn't exceed what's left to refund on that payment, then
 * atomically updates the Payment's refunded total, the Request's paid
 * total, and creates the Refund + activity records together.
 */
export const processRefund = async (paymentId: string, amount: number, reason: string, actorId: string) => {
  const session = await mongoose.startSession();
  try {
    let refundDoc: unknown;

    await session.withTransaction(async () => {
      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) throw ApiError.notFound('Payment not found');

      const refundableAmount = payment.amount - payment.refundedAmount;
      if (amount <= 0 || amount > refundableAmount) {
        throw ApiError.badRequest(`Refund amount must be between Rs.1 and Rs.${refundableAmount}`);
      }

      payment.refundedAmount += amount;
      payment.status =
        payment.refundedAmount >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
      await payment.save({ session });

      const [refund] = await Refund.create(
        [
          {
            payment: payment._id,
            request: payment.request,
            amount,
            reason,
            status: RefundStatus.PROCESSED,
            processedBy: actorId,
            processedAt: new Date(),
            createdBy: actorId,
          },
        ],
        { session },
      );

      const request = await RequestModel.findById(payment.request).session(session);
      if (request) {
        const newPaidAmount = Math.max(0, request.paymentSummary.paidAmount - amount);
        request.paymentSummary.paidAmount = newPaidAmount;
        request.paymentSummary.status = deriveSummaryStatus(request.paymentSummary.totalAmount, newPaidAmount);
        await request.save({ session });
      }

      await RequestActivity.create(
        [
          {
            request: payment.request,
            action: 'PAYMENT_REFUNDED',
            performedBy: actorId,
            performedByRole: 'system',
            description: `Refunded Rs.${amount}: ${reason}`,
          },
        ],
        { session },
      );

      refundDoc = refund;
    });

    return refundDoc!;
  } finally {
    session.endSession();
  }
};

/**
 * Returns the existing invoice for a request, or generates one from the
 * service's fee breakdown the first time it's requested.
 */
export const getOrCreateInvoice = async (requestId: string) => {
  const existing = await Invoice.findOne({ request: requestId });
  if (existing) return existing;

  const request = await RequestModel.findById(requestId);
  if (!request) throw ApiError.notFound('Request not found');

  const service = await Service.findById(request.service);
  if (!service) throw ApiError.badRequest('Service no longer exists');

  const invoiceNumber = await generateInvoiceNumber();

  return Invoice.create({
    invoiceNumber,
    request: request._id,
    service: service._id,
    customer: request.customer,
    customerName: request.customerName,
    customerMobile: request.customerMobile,
    lineItems: [
      { label: 'Service Fee', amount: service.serviceFee },
      { label: 'Government Fee', amount: service.govtFee },
      { label: 'CSC Fee', amount: service.cscFee },
    ],
    totalAmount: request.paymentSummary.totalAmount,
    status: request.paymentSummary.status,
  });
};
