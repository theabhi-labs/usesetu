import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

export enum TokenStatus {
  WAITING = 'waiting',
  CALLED = 'called',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum TokenPriority {
  NORMAL = 'normal',
  SENIOR_CITIZEN = 'senior_citizen',
  PREGNANT = 'pregnant',
  DISABLED = 'disabled',
  VIP = 'vip',
  EMERGENCY = 'emergency',
}

// Lower number = served first. Used to sort the waiting list without a
// client-side re-sort — the query itself returns tokens in call order.
export const PRIORITY_WEIGHT: Record<TokenPriority, number> = {
  [TokenPriority.EMERGENCY]: 0,
  [TokenPriority.VIP]: 1,
  [TokenPriority.SENIOR_CITIZEN]: 2,
  [TokenPriority.DISABLED]: 2,
  [TokenPriority.PREGNANT]: 2,
  [TokenPriority.NORMAL]: 3,
};

export interface IQueueToken extends Document {
  tokenNumber: string; // e.g. "AAD-001"
  queue: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  customer?: mongoose.Types.ObjectId;
  request?: mongoose.Types.ObjectId;

  tokenDate: string; // 'YYYY-MM-DD' — scopes daily numbering + daily queries
  status: TokenStatus;
  priority: TokenPriority;
  priorityWeight: number; // denormalized from PRIORITY_WEIGHT for index-sortable ordering

  counter?: string; // counter key from Queue.counters
  estimatedCallTime?: Date;
  calledAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  recallCount: number;

  remarks?: string;

  createdAt: Date;
  updatedAt: Date;
}

const queueTokenSchema = new Schema<IQueueToken>(
  {
    tokenNumber: { type: String, required: true },
    queue: { type: Schema.Types.ObjectId, ref: 'Queue', required: true },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User' },
    request: { type: Schema.Types.ObjectId, ref: 'Request' },

    tokenDate: { type: String, required: true },
    status: { type: String, enum: Object.values(TokenStatus), default: TokenStatus.WAITING },
    priority: { type: String, enum: Object.values(TokenPriority), default: TokenPriority.NORMAL },
    priorityWeight: { type: Number, default: 3 },

    counter: String,
    estimatedCallTime: Date,
    calledAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    recallCount: { type: Number, default: 0 },

    remarks: String,
  },
  { timestamps: true },
);

// ── Index strategy ──────────────────────────────────────────────────
// 1. Daily-unique token numbering per queue (also enforced at generation time
//    via the atomic Counter, this index is the DB-level safety net).
queueTokenSchema.index({ queue: 1, tokenDate: 1, tokenNumber: 1 }, { unique: true });
// 2. The hot path: "next token to call" — waiting tokens for today, ordered
//    by priority then arrival time. This compound index lets MongoDB return
//    the correct next-token without an in-memory sort.
queueTokenSchema.index({ queue: 1, tokenDate: 1, status: 1, priorityWeight: 1, createdAt: 1 });
// 3. Customer's own token history / "my current token" lookup.
queueTokenSchema.index({ customer: 1, createdAt: -1 });

queueTokenSchema.plugin(tenantPlugin);

export const QueueToken: Model<IQueueToken> = mongoose.model<IQueueToken>('QueueToken', queueTokenSchema);
