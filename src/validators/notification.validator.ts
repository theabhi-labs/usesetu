import { z } from 'zod';
import { EVENT_TYPES, RuleConditionOperator, RuleActionType } from '../models/automationRule.model';

// ── Notification (end-user facing) ───────────────────────────────────
export const notificationQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.string().optional(),
  }),
});

export const notificationIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const updatePreferenceSchema = z.object({
  body: z.object({
    emailEnabled: z.boolean().optional(),
    inAppEnabled: z.boolean().optional(),
    smsEnabled: z.boolean().optional(),
    whatsappEnabled: z.boolean().optional(),
  }),
});

// ── Automation rules (admin) ─────────────────────────────────────────
const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.nativeEnum(RuleConditionOperator),
  value: z.unknown().optional(),
});

const actionSchema = z.object({
  type: z.nativeEnum(RuleActionType),
  templateKey: z.string().optional(),
  reminderOffsetHours: z.number().optional(),
  reminderMessage: z.string().optional(),
});

export const createRuleSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150),
    description: z.string().optional(),
    eventType: z.enum(EVENT_TYPES),
    logicType: z.enum(['AND', 'OR']).optional(),
    conditions: z.array(conditionSchema).optional(),
    actions: z.array(actionSchema).min(1),
    isActive: z.boolean().optional(),
    priority: z.number().optional(),
  }),
});

export const updateRuleSchema = z.object({
  body: createRuleSchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

export const ruleIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// ── Notification templates (admin) ───────────────────────────────────
export const upsertTemplateSchema = z.object({
  body: z.object({
    key: z.string().min(1),
    channel: z.enum(['email', 'in_app']),
    subject: z.string().optional(),
    bodyTemplate: z.string().min(1),
    variables: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  }),
});
