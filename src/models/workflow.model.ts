import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';
import { Role } from '../types/auth.types';

export enum WorkflowStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum StageType {
  INITIAL = 'initial',
  INTERMEDIATE = 'intermediate',
  FINAL = 'final',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

interface IStageRequirements {
  paymentRequired: boolean;
  documentVerificationRequired: boolean;
  tokenRequired: boolean;
  appointmentRequired: boolean;
}

interface IStageNotify {
  customerEmail: boolean;
  customerInApp: boolean;
  adminEmail: boolean;
  adminInApp: boolean;
}

export interface IWorkflowStage {
  key: string; // stable identifier, referenced by transitions and by Request.currentStage
  title: string;
  description?: string;
  color: string;
  backgroundColor: string;
  icon?: string;
  order: number;

  completionPercentage: number; // 0-100, drives the customer-facing progress bar
  estimatedDurationValue?: number;
  estimatedDurationUnit?: 'minutes' | 'hours' | 'days';

  statusType: StageType;
  visibleToCustomer: boolean;
  visibleToAdmin: boolean;
  isFinal: boolean;

  allowedRoles: Role[]; // who can move a request INTO this stage
  requirements: IStageRequirements;
  notifyOnEnter: IStageNotify;
}

export interface IWorkflowTransition {
  fromStage: string; // stage key
  toStage: string; // stage key
  label: string; // e.g. "Approve", "Reject", "Send Back"
  allowedRoles: Role[];
  requireRemark: boolean;
  isRejectTransition: boolean;
  isCancelTransition: boolean;
  isReopenTransition: boolean;
}

export interface IWorkflow extends Document {
  service: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: WorkflowStatus;
  isDefault: boolean;
  version: number;

  stages: IWorkflowStage[];
  transitions: IWorkflowTransition[];

  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const stageRequirementsSchema = new Schema<IStageRequirements>(
  {
    paymentRequired: { type: Boolean, default: false },
    documentVerificationRequired: { type: Boolean, default: false },
    tokenRequired: { type: Boolean, default: false },
    appointmentRequired: { type: Boolean, default: false },
  },
  { _id: false },
);

const stageNotifySchema = new Schema<IStageNotify>(
  {
    customerEmail: { type: Boolean, default: true },
    customerInApp: { type: Boolean, default: true },
    adminEmail: { type: Boolean, default: false },
    adminInApp: { type: Boolean, default: true },
  },
  { _id: false },
);

const workflowStageSchema = new Schema<IWorkflowStage>(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    color: { type: String, default: '#FFFFFF' },
    backgroundColor: { type: String, default: '#FF6700' },
    icon: String,
    order: { type: Number, default: 0 },

    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    estimatedDurationValue: Number,
    estimatedDurationUnit: { type: String, enum: ['minutes', 'hours', 'days'] },

    statusType: { type: String, enum: Object.values(StageType), default: StageType.INTERMEDIATE },
    visibleToCustomer: { type: Boolean, default: true },
    visibleToAdmin: { type: Boolean, default: true },
    isFinal: { type: Boolean, default: false },

    allowedRoles: { type: [String], enum: Object.values(Role), default: [Role.ADMIN, Role.SUPER_ADMIN] },
    requirements: { type: stageRequirementsSchema, default: () => ({}) },
    notifyOnEnter: { type: stageNotifySchema, default: () => ({}) },
  },
  { _id: false },
);

const workflowTransitionSchema = new Schema<IWorkflowTransition>(
  {
    fromStage: { type: String, required: true },
    toStage: { type: String, required: true },
    label: { type: String, required: true },
    allowedRoles: { type: [String], enum: Object.values(Role), default: [Role.ADMIN, Role.SUPER_ADMIN] },
    requireRemark: { type: Boolean, default: false },
    isRejectTransition: { type: Boolean, default: false },
    isCancelTransition: { type: Boolean, default: false },
    isReopenTransition: { type: Boolean, default: false },
  },
  { _id: false },
);

const workflowSchema = new Schema<IWorkflow>(
  {
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    status: { type: String, enum: Object.values(WorkflowStatus), default: WorkflowStatus.DRAFT },
    isDefault: { type: Boolean, default: false },
    version: { type: Number, default: 1 },

    stages: { type: [workflowStageSchema], default: [] },
    transitions: { type: [workflowTransitionSchema], default: [] },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

// ── Index strategy ──────────────────────────────────────────────────
// 1. Hot path: "the published/default workflow for this service" — read on
//    every request creation and every stage transition.
workflowSchema.index({ service: 1, status: 1, isDefault: 1 });
workflowSchema.index({ deletedAt: 1 });

workflowSchema.pre(/^find/, function (this: mongoose.Query<unknown, IWorkflow>, next) {
  if (this.getFilter().deletedAt === undefined && this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
  next();
});

workflowSchema.plugin(tenantPlugin);

export const Workflow: Model<IWorkflow> = mongoose.model<IWorkflow>('Workflow', workflowSchema);
