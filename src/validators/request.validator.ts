import { z } from 'zod';
import { RequestStatus, RequestPriority, DocumentVerificationStatus } from '../models/request.model';
import { CommentVisibility } from '../models/requestComment.model';

export const requestIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const requestQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    service: z.string().optional(),
    category: z.string().optional(),
    status: z.nativeEnum(RequestStatus).optional(),
    priority: z.nativeEnum(RequestPriority).optional(),
    assignedTo: z.string().optional(),
    customer: z.string().optional(),
    search: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    sortBy: z.enum(['createdAt', 'priority', 'completionPercentage']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const moveStageSchema = z.object({
  body: z.object({
    targetStage: z.string().min(1),
    remark: z.string().optional(),
    context: z
      .object({
        paymentCompleted: z.boolean().optional(),
        documentsVerified: z.boolean().optional(),
        tokenGenerated: z.boolean().optional(),
        appointmentBooked: z.boolean().optional(),
      })
      .optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const assignRequestSchema = z.object({
  body: z.object({ assignedTo: z.string().min(1) }),
  params: z.object({ id: z.string().min(1) }),
});

export const addCommentSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(2000),
    visibility: z.nativeEnum(CommentVisibility).optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});

export const verifyDocumentSchema = z.object({
  body: z.object({
    verificationStatus: z.nativeEnum(DocumentVerificationStatus),
    verificationRemark: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(1), docId: z.string().min(1) }),
});

export const bulkActionSchema = z.object({
  body: z.object({
    requestIds: z.array(z.string().min(1)).min(1).max(200),
    action: z.enum(['assign', 'approve', 'reject', 'cancel', 'tag']),
    targetStage: z.string().optional(),
    assignedTo: z.string().optional(),
    tag: z.string().optional(),
    remark: z.string().optional(),
  }),
});
