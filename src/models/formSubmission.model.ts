import mongoose, { Schema, Document, Model } from 'mongoose';

export enum SubmissionStatus {
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

export interface IFormSubmission extends Document {
  form: mongoose.Types.ObjectId; // exact form version this was submitted against
  formGroupId: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  customer?: mongoose.Types.ObjectId; // undefined for guest/anonymous submissions, if ever allowed

  // Keyed by fieldKey -> submitted value. Stored as Mixed rather than a
  // rigid schema because the field set is fully dynamic per form/version.
  values: Record<string, unknown>;

  // Populated once the Request Management module creates the corresponding
  // Request document (kept optional here to avoid a hard dependency).
  request?: mongoose.Types.ObjectId;

  status: SubmissionStatus;
  submittedIp?: string;
  userAgent?: string;

  createdAt: Date;
  updatedAt: Date;
}

const formSubmissionSchema = new Schema<IFormSubmission>(
  {
    form: { type: Schema.Types.ObjectId, ref: 'Form', required: true, index: true },
    formGroupId: { type: Schema.Types.ObjectId, required: true, index: true },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    values: { type: Schema.Types.Mixed, required: true },

    request: { type: Schema.Types.ObjectId, ref: 'Request' },

    status: { type: String, enum: Object.values(SubmissionStatus), default: SubmissionStatus.SUBMITTED },
    submittedIp: String,
    userAgent: String,
  },
  { timestamps: true },
);

// ── Index strategy ──────────────────────────────────────────────────
// 1. Admin "submissions for this service, newest first" — the most common list view.
formSubmissionSchema.index({ service: 1, createdAt: -1 });
// 2. Customer's own submission history.
formSubmissionSchema.index({ customer: 1, createdAt: -1 });
// 3. All submissions across every version of a given form definition.
formSubmissionSchema.index({ formGroupId: 1, createdAt: -1 });

export const FormSubmission: Model<IFormSubmission> = mongoose.model<IFormSubmission>(
  'FormSubmission',
  formSubmissionSchema,
);
