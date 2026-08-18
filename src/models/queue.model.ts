import mongoose, { Schema, Document, Model } from 'mongoose';

interface ICounter {
  key: string;
  name: string;
  status: 'active' | 'inactive';
  currentToken?: mongoose.Types.ObjectId;
}

interface IQueueRules {
  maxWaitingMinutes: number; // beyond this, auto-expire (0 = disabled)
  autoSkipAfterCalls: number; // skip if not responded within N recalls
  autoCloseTime?: string; // 'HH:mm' — queue stops accepting new tokens after this
  autoResetDaily: boolean;
}

export interface IQueue extends Document {
  service: mongoose.Types.ObjectId;
  name: string;
  description?: string;

  dailyLimit: number; // 0 = unlimited
  tokenPrefix: string;
  priorityEnabled: boolean;
  estimatedServiceTimeMinutes: number;
  displayEnabled: boolean;
  status: 'active' | 'inactive';

  counters: ICounter[];
  rules: IQueueRules;

  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const counterSchema = new Schema<ICounter>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    currentToken: { type: Schema.Types.ObjectId, ref: 'QueueToken' },
  },
  { _id: false },
);

const queueSchema = new Schema<IQueue>(
  {
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: String,

    dailyLimit: { type: Number, default: 0, min: 0 },
    tokenPrefix: { type: String, required: true, uppercase: true, maxlength: 6 },
    priorityEnabled: { type: Boolean, default: true },
    estimatedServiceTimeMinutes: { type: Number, default: 5, min: 1 },
    displayEnabled: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },

    counters: {
      type: [counterSchema],
      default: [{ key: 'counter-1', name: 'Counter 1', status: 'active' }],
    },
    rules: {
      maxWaitingMinutes: { type: Number, default: 0 },
      autoSkipAfterCalls: { type: Number, default: 3 },
      autoCloseTime: String,
      autoResetDaily: { type: Boolean, default: true },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// One queue config per service — service already unique-indexed above.
export const Queue: Model<IQueue> = mongoose.model<IQueue>('Queue', queueSchema);
