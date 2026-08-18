import mongoose, { Schema, Document, Model } from 'mongoose';
import { Role } from '../types/auth.types';

/**
 * One row per stage transition. Written by the (future) Request Management
 * module whenever `workflowEngine.moveStage()` succeeds. Kept as a separate
 * collection (not embedded in Request) because it grows unboundedly and is
 * queried independently for timelines/analytics — embedding would bloat the
 * Request document and blow past useful working-set size over time.
 */
export interface IWorkflowHistory extends Document {
  request: mongoose.Types.ObjectId; // forward reference — Request model ships in the next module
  workflow: mongoose.Types.ObjectId;

  fromStage?: string; // undefined for the very first entry (request creation)
  toStage: string;

  changedBy: mongoose.Types.ObjectId;
  changedByRole: Role;
  remark?: string;
  isCustomerVisible: boolean;

  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
}

const workflowHistorySchema = new Schema<IWorkflowHistory>(
  {
    request: { type: Schema.Types.ObjectId, ref: 'Request', required: true, index: true },
    workflow: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },

    fromStage: { type: String },
    toStage: { type: String, required: true },

    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedByRole: { type: String, enum: Object.values(Role), required: true },
    remark: { type: String, maxlength: 1000 },
    isCustomerVisible: { type: Boolean, default: true },

    ipAddress: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// ── Index strategy ──────────────────────────────────────────────────
// 1. The request timeline view — fetch every transition for one request in order.
workflowHistorySchema.index({ request: 1, createdAt: 1 });
// 2. Workflow analytics — "how many requests are currently/have been at stage X".
workflowHistorySchema.index({ workflow: 1, toStage: 1, createdAt: -1 });

export const WorkflowHistory: Model<IWorkflowHistory> = mongoose.model<IWorkflowHistory>(
  'WorkflowHistory',
  workflowHistorySchema,
);
