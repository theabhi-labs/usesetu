import { Request as ExpressRequest, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { Payment } from '../models/payment.model';
import { Receipt } from '../models/receipt.model';
import { recordPayment, processRefund, getOrCreateInvoice } from '../services/billing.service';
import { generateQrDataUrl } from '../utils/qrGenerator';
import { env } from '../config/env';
import { Role } from '../types/auth.types';

// ---------------------------------------------------------------------------
// POST /api/v1/payments  (Staff+ — record a payment against a request)
// ---------------------------------------------------------------------------
export const createPayment = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { request, paymentType, paymentMethod, amount, transactionId, remarks } = req.body;

  const result = await recordPayment(
    { requestId: request, paymentType, paymentMethod, amount, transactionId, remarks },
    req.user!.userId,
  );

  res.status(201).json(new ApiResponse(201, result, 'Payment recorded successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/payments  (Staff+ — list, filter, paginated)
// ---------------------------------------------------------------------------
export const getPayments = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const {
    page = '1',
    limit = '20',
    request,
    customer,
    status,
    paymentMethod,
    dateFrom,
    dateTo,
  } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (request) filter.request = request;
  if (customer) filter.customer = customer;
  if (status) filter.status = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (dateFrom || dateTo) {
    filter.createdAt = {
      ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { $lte: new Date(dateTo) } : {}),
    };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('request', 'applicationNumber')
      .populate('customer', 'name mobile')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Payment.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      payments,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    }),
  );
});

// ---------------------------------------------------------------------------
// GET /api/v1/payments/:id  (Staff+ / owner customer)
// ---------------------------------------------------------------------------
export const getPaymentById = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const payment = await Payment.findById(req.params.id)
    .populate('request', 'applicationNumber')
    .populate('customer', 'name mobile email');

  if (!payment) throw ApiError.notFound('Payment not found');

  if (req.user!.role === Role.CUSTOMER && String(payment.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this payment');
  }

  res.status(200).json(new ApiResponse(200, payment));
});

// ---------------------------------------------------------------------------
// POST /api/v1/payments/:id/refund  (Staff+)
// ---------------------------------------------------------------------------
export const createRefund = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { amount, reason } = req.body;
  const refund = await processRefund(req.params.id, amount, reason, req.user!.userId);
  res.status(201).json(new ApiResponse(201, refund, 'Refund processed successfully'));
});

// ---------------------------------------------------------------------------
// GET /api/v1/payments/:id/receipt  (Staff+ / owner customer — includes QR)
// ---------------------------------------------------------------------------
export const getReceipt = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const receipt = await Receipt.findOne({ payment: req.params.id })
    .populate('request', 'applicationNumber')
    .populate('customer', 'name mobile');

  if (!receipt) throw ApiError.notFound('Receipt not found for this payment');

  if (req.user!.role === Role.CUSTOMER && String(receipt.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this receipt');
  }

  const requestDoc = receipt.request as unknown as { applicationNumber?: string };
  const qrTarget = `${env.CLIENT_URL}/track/${requestDoc?.applicationNumber ?? ''}`;
  const qrCode = await generateQrDataUrl(qrTarget);

  res.status(200).json(new ApiResponse(200, { ...receipt.toObject(), qrCode }));
});

// ---------------------------------------------------------------------------
// GET /api/v1/payments/request/:requestId/invoice  (Staff+ / owner customer)
// ---------------------------------------------------------------------------
export const getInvoice = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const invoice = await getOrCreateInvoice(req.params.requestId);

  if (req.user!.role === Role.CUSTOMER && String(invoice.customer) !== req.user!.userId) {
    throw ApiError.forbidden('You do not have access to this invoice');
  }

  const qrCode = await generateQrDataUrl(`${env.CLIENT_URL}/invoice/${invoice.invoiceNumber}`);

  res.status(200).json(new ApiResponse(200, { ...invoice.toObject(), qrCode }));
});

// ---------------------------------------------------------------------------
// GET /api/v1/payments/stats  (Staff+ — daily/monthly collection report)
// ---------------------------------------------------------------------------
export const getPaymentStats = asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { dateFrom, dateTo } = req.query as Record<string, string>;

  const match: Record<string, unknown> = { status: 'success' };
  if (dateFrom || dateTo) {
    match.createdAt = {
      ...(dateFrom ? { $gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { $lte: new Date(dateTo) } : {}),
    };
  }

  const [result] = await Payment.aggregate([
    { $match: match },
    {
      $facet: {
        totalCollection: [{ $group: { _id: null, total: { $sum: '$amount' } } }],
        byMethod: [{ $group: { _id: '$paymentMethod', total: { $sum: '$amount' }, count: { $sum: 1 } } }],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              total: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
      },
    },
  ]);

  res.status(200).json(new ApiResponse(200, result));
});
