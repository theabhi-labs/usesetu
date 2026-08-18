import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * One document per calendar day, upserted nightly by the snapshot job.
 * Historical trend charts (last 30/90/365 days) read this tiny collection
 * instead of re-running a full aggregation over the Request/Payment history
 * every time a dashboard loads — the cost of computing "yesterday's totals"
 * is paid once, not on every page view for the rest of time.
 */
export interface IAnalyticsSnapshot extends Document {
  date: string;

  requestsCreated: number;
  requestsCompleted: number;
  requestsRejected: number;
  requestsCancelled: number;

  revenue: number;
  newCustomers: number;
  queueTokensIssued: number;
  appointmentsBooked: number;

  createdAt: Date;
  updatedAt: Date;
}

const analyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    date: { type: String, required: true, unique: true },

    requestsCreated: { type: Number, default: 0 },
    requestsCompleted: { type: Number, default: 0 },
    requestsRejected: { type: Number, default: 0 },
    requestsCancelled: { type: Number, default: 0 },

    revenue: { type: Number, default: 0 },
    newCustomers: { type: Number, default: 0 },
    queueTokensIssued: { type: Number, default: 0 },
    appointmentsBooked: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// date already unique-indexed above — that single index also serves range
// queries ({ date: { $gte, $lte } }) since string dates in 'YYYY-MM-DD'
// format sort lexicographically the same as chronologically.
export const AnalyticsSnapshot: Model<IAnalyticsSnapshot> = mongoose.model<IAnalyticsSnapshot>(
  'AnalyticsSnapshot',
  analyticsSnapshotSchema,
);
