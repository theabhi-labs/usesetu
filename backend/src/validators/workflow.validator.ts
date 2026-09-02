import { z } from 'zod';
import { StageType } from '../models/workflow.model';
import { Role } from '../types/auth.types';

const stageRequirementsSchema = z.object({
  paymentRequired: z.boolean().optional(),
  documentVerificationRequired: z.boolean().optional(),
  tokenRequired: z.boolean().optional(),
  appointmentRequired: z.boolean().optional(),
});

const stageNotifySchema = z.object({
  customerEmail: z.boolean().optional(),
  customerInApp: z.boolean().optional(),
  adminEmail: z.boolean().optional(),
  adminInApp: z.boolean().optional(),
});

const workflowStageSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'key must be alphanumeric/underscore, starting with a letter'),
  title: z.string().min(1).max(150),
  description: z.string().optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().optional(),

  completionPercentage: z.number().min(0).max(100).optional(),
  estimatedDurationValue: z.number().optional(),
  estimatedDurationUnit: z.enum(['minutes', 'hours', 'days']).optional(),

  statusType: z.nativeEnum(StageType).optional(),
  visibleToCustomer: z.boolean().optional(),
  visibleToAdmin: z.boolean().optional(),
  isFinal: z.boolean().optional(),

  allowedRoles: z.array(z.nativeEnum(Role)).optional(),
  requirements: stageRequirementsSchema.optional(),
  notifyOnEnter: stageNotifySchema.optional(),
});

const workflowTransitionSchema = z.object({
  fromStage: z.string().min(1),
  toStage: z.string().min(1),
  label: z.string().min(1).max(100),
  allowedRoles: z.array(z.nativeEnum(Role)).optional(),
  requireRemark: z.boolean().optional(),
  isRejectTransition: z.boolean().optional(),
  isCancelTransition: z.boolean().optional(),
  isReopenTransition: z.boolean().optional(),
});

// Guards against duplicate stage keys and transitions pointing at
// non-existent stages — the two most common workflow-builder authoring bugs.
const validateStageGraph = (
  data: { stages?: z.infer<typeof workflowStageSchema>[]; transitions?: z.infer<typeof workflowTransitionSchema>[] },
  ctx: z.RefinementCtx,
) => {
  const stages = data.stages || [];
  const keys = new Set<string>();
  for (const s of stages) {
    if (keys.has(s.key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate stage key: ${s.key}` });
    }
    keys.add(s.key);
  }
  for (const t of data.transitions || []) {
    if (stages.length > 0 && !keys.has(t.fromStage)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Transition references unknown fromStage: ${t.fromStage}` });
    }
    if (stages.length > 0 && !keys.has(t.toStage)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Transition references unknown toStage: ${t.toStage}` });
    }
  }
};

export const createWorkflowSchema = z.object({
  body: z
    .object({
      service: z.string().min(1, 'Service is required'),
      name: z.string().trim().min(2).max(150),
      description: z.string().optional(),
      isDefault: z.boolean().optional(),
      stages: z.array(workflowStageSchema).optional(),
      transitions: z.array(workflowTransitionSchema).optional(),
    })
    .superRefine(validateStageGraph),
});

export const updateWorkflowSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(150).optional(),
      description: z.string().optional(),
      isDefault: z.boolean().optional(),
      stages: z.array(workflowStageSchema).optional(),
      transitions: z.array(workflowTransitionSchema).optional(),
    })
    .superRefine(validateStageGraph),
  params: z.object({ id: z.string().min(1) }),
});

export const workflowIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const validateTransitionSchema = z.object({
  body: z.object({
    currentStage: z.string().min(1),
    targetStage: z.string().min(1),
    context: z
      .object({
        paymentCompleted: z.boolean().optional(),
        documentsVerified: z.boolean().optional(),
        tokenGenerated: z.boolean().optional(),
        appointmentBooked: z.boolean().optional(),
      })
      .optional(),
    remark: z.string().optional(),
  }),
  params: z.object({ id: z.string().min(1) }),
});
