import { z } from 'zod';
import { PaymentType, PaymentMethod, PaymentStatus } from '../models/payment.model';

export const recordPaymentSchema = z.object({
  body: z.object({
    request: z.string().min(1),
    paymentType: z.nativeEnum(PaymentType),
    paymentMethod: z.nativeEnum(PaymentMethod),
    amount: z.number().positive(),
    transactionId: z.string().optional(),
    remarks: z.string().optional(),
  }),
});

export const refundSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    reason: z.string().min(1).max(500),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const paymentIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const paymentQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    request: z.string().optional(),
    customer: z.string().optional(),
    status: z.nativeEnum(PaymentStatus).optional(),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }),
});

export const requestIdParamSchema = z.object({
  params: z.object({ requestId: z.string().min(1) }),
});
