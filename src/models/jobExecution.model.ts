import mongoose, { Schema, Document } from 'mongoose';

export type JobStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface IJobExecution extends Document {
  jobName: string;
  executionId: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  status: JobStatus;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorCount: number;
  lastError?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const jobExecutionSchema = new Schema<IJobExecution>(
  {
    jobName: { type: String, required: true, index: true },
    executionId: { type: String, required: true, unique: true, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    durationMs: { type: Number },
    status: {
      type: String,
      enum: ['RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED'],
      default: 'RUNNING',
      index: true,
    },
    recordsProcessed: { type: Number, default: 0 },
    recordsSucceeded: { type: Number, default: 0 },
    recordsFailed: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    lastError: { type: String },
    requestId: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  },
);

jobExecutionSchema.index({ jobName: 1, startedAt: -1 });

export const JobExecution = mongoose.model<IJobExecution>('JobExecution', jobExecutionSchema);
