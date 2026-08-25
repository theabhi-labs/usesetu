import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUsageRecord extends Document {
  applicationId: mongoose.Types.ObjectId;
  metric: string;
  period: string; // 'current' for gauges (active_users, storage_bytes), 'YYYY-MM' for cyclical counters
  used: number;
  limit?: number;
  createdAt: Date;
  updatedAt: Date;
}

const usageRecordSchema = new Schema<IUsageRecord>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    metric: {
      type: String,
      required: true,
      trim: true,
    },
    period: {
      type: String,
      required: true,
      default: 'current',
      trim: true,
    },
    used: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    limit: {
      type: Number,
    },
  },
  { timestamps: true },
);

// Compound unique index ensuring one record per application, metric, and period
usageRecordSchema.index({ applicationId: 1, metric: 1, period: 1 }, { unique: true });
usageRecordSchema.index({ applicationId: 1, period: 1 });

export const UsageRecord: Model<IUsageRecord> = mongoose.model<IUsageRecord>('UsageRecord', usageRecordSchema);
