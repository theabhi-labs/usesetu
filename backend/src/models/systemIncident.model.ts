import mongoose, { Schema, Document } from 'mongoose';

export type IncidentSeverity = 'P0' | 'P1' | 'P2' | 'P3';
export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';

export interface ISystemIncident extends Document {
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  source: string;
  fingerprint: string;
  affectedService: string;
  affectedApplications: mongoose.Types.ObjectId[];
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  occurrenceCount: number;
  acknowledgedBy?: mongoose.Types.ObjectId;
  acknowledgedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const systemIncidentSchema = new Schema<ISystemIncident>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['P0', 'P1', 'P2', 'P3'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED'],
      default: 'OPEN',
      index: true,
    },
    source: { type: String, required: true, default: 'alert_engine', index: true },
    fingerprint: { type: String, required: true, index: true },
    affectedService: { type: String, required: true, default: 'api' },
    affectedApplications: [{ type: Schema.Types.ObjectId, ref: 'Application' }],
    firstDetectedAt: { type: Date, default: Date.now },
    lastDetectedAt: { type: Date, default: Date.now, index: true },
    occurrenceCount: { type: Number, default: 1 },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  },
);

systemIncidentSchema.index({ status: 1, severity: 1, lastDetectedAt: -1 });

export const SystemIncident = mongoose.model<ISystemIncident>('SystemIncident', systemIncidentSchema);
