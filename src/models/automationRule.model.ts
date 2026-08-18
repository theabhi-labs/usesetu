import mongoose, { Schema, Document, Model } from 'mongoose';

// Extensible, not database-driven by design — new event types are added
// here as new features ship, but firing one is just calling emitEvent()
// from application code (see eventBus.service.ts). No migration needed to
// add a new *type* of automation trigger, only to add a new event source.
export const EVENT_TYPES = [
  'customer.registered',
  'request.created',
  'request.stage_changed',
  'request.completed',
  'payment.received',
  'payment.refunded',
  'document.uploaded',
  'queue.token_generated',
  'appointment.booked',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export enum RuleConditionOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  CONTAINS = 'contains',
}

export enum RuleActionType {
  SEND_EMAIL = 'send_email',
  CREATE_IN_APP_NOTIFICATION = 'create_in_app_notification',
  CREATE_REMINDER = 'create_reminder',
}

interface IRuleCondition {
  field: string;
  operator: RuleConditionOperator;
  value: unknown;
}

interface IRuleAction {
  type: RuleActionType;
  templateKey?: string;
  reminderOffsetHours?: number;
  reminderMessage?: string;
}

export interface IAutomationRule extends Document {
  name: string;
  description?: string;
  eventType: EventType;
  logicType: 'AND' | 'OR';
  conditions: IRuleCondition[];
  actions: IRuleAction[];
  isActive: boolean;
  priority: number;

  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const ruleConditionSchema = new Schema<IRuleCondition>(
  {
    field: { type: String, required: true },
    operator: { type: String, enum: Object.values(RuleConditionOperator), required: true },
    value: Schema.Types.Mixed,
  },
  { _id: false },
);

const ruleActionSchema = new Schema<IRuleAction>(
  {
    type: { type: String, enum: Object.values(RuleActionType), required: true },
    templateKey: String,
    reminderOffsetHours: Number,
    reminderMessage: String,
  },
  { _id: false },
);

const automationRuleSchema = new Schema<IAutomationRule>(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    eventType: { type: String, enum: EVENT_TYPES, required: true },
    logicType: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    conditions: { type: [ruleConditionSchema], default: [] },
    actions: { type: [ruleActionSchema], default: [] },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// The engine's hot query: "every active rule for this event, in priority order".
automationRuleSchema.index({ eventType: 1, isActive: 1, priority: 1 });

export const AutomationRule: Model<IAutomationRule> = mongoose.model<IAutomationRule>(
  'AutomationRule',
  automationRuleSchema,
);
