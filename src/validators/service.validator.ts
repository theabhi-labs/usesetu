import { z } from 'zod';
import { ServiceMode, RequiredDocumentType } from '../models/service.model';

const faqSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(2000),
});

const paymentSettingsSchema = z.object({
  advancePayment: z.boolean().optional(),
  advanceAmount: z.number().min(0).optional(),
  allowPartialPayment: z.boolean().optional(),
  allowFullPayment: z.boolean().optional(),
  paymentBeforeProcessing: z.boolean().optional(),
});

export const createServiceSchema = z.object({
  body: z.object({
    category: z.string().min(1, 'Category is required'),
    name: z.string().trim().min(2).max(200),
    description: z.string().max(3000).optional(),
    instructions: z.string().max(5000).optional(),

    serviceMode: z.nativeEnum(ServiceMode).optional(),

    serviceFee: z.number().min(0).optional(),
    govtFee: z.number().min(0).optional(),
    cscFee: z.number().min(0).optional(),

    estimatedTimeValue: z.number().min(0).optional(),
    estimatedTimeUnit: z.enum(['minutes', 'hours', 'days']).optional(),
    workingDays: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])).optional(),

    requiredDocuments: z.array(z.nativeEnum(RequiredDocumentType)).optional(),
    faqs: z.array(faqSchema).optional(),
    paymentSettings: paymentSettingsSchema.optional(),
    customStatusWorkflow: z.array(z.string()).optional(),

    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      })
      .optional(),

    sortOrder: z.number().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    isFeatured: z.boolean().optional(),
    homepageVisibility: z.boolean().optional(),
  }),
});

export const updateServiceSchema = z.object({
  body: createServiceSchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

export const serviceIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const serviceQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
    serviceMode: z.nativeEnum(ServiceMode).optional(),
    isFeatured: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['name', 'sortOrder', 'createdAt', 'serviceFee']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
