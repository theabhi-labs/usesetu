import mongoose, { Schema, Document, Model } from 'mongoose';

export enum ReportType {
  REQUESTS = 'requests',
  REVENUE = 'revenue',
  CUSTOMERS = 'customers',
  SERVICES = 'services',
  PAYMENTS = 'payments',
}

export interface ISavedReport extends Document {
  name: string;
  reportType: ReportType;
  filters: Record<string, unknown>;
  columns: string[];
  groupBy?: string;
  sortBy?: string;
  isShared: boolean;

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const savedReportSchema = new Schema<ISavedReport>(
  {
    name: { type: String, required: true },
    reportType: { type: String, enum: Object.values(ReportType), required: true },
    filters: { type: Schema.Types.Mixed, default: {} },
    columns: { type: [String], default: [] },
    groupBy: String,
    sortBy: String,
    isShared: { type: Boolean, default: false },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

savedReportSchema.index({ createdBy: 1, reportType: 1 });

export const SavedReport: Model<ISavedReport> = mongoose.model<ISavedReport>('SavedReport', savedReportSchema);
