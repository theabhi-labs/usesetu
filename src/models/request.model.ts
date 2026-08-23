import mongoose, { Schema, Document, Model } from 'mongoose';

export enum RequestStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum RequestPriority {
  NORMAL = 'normal',
  URGENT = 'urgent',
  VIP = 'vip',
  SENIOR_CITIZEN = 'senior_citizen',
  DISABLED = 'disabled',
}

export enum DocumentVerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  REUPLOAD_REQUIRED = 'reupload_required',
}

export enum PaymentSummaryStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
}

interface IRequestDocument {
  type: string; // matches RequiredDocumentType from Service, kept as string for forward flexibility
  url: string;
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
  verificationStatus: DocumentVerificationStatus;
  verificationRemark?: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface ICompletionDocument {
  url: string;
  fileId: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  downloadPolicy: 'once' | 'permanent';
  downloadCount: number;
  downloads: Array<{
    downloadedBy: mongoose.Types.ObjectId;
    downloadedAt: Date;
    ipAddress?: string;
  }>;
}

export interface IRequest extends Document {
  applicationNumber: string;

  category: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  formSubmission: mongoose.Types.ObjectId;
  workflow: mongoose.Types.ObjectId;

  // Denormalized customer snapshot — enables instant search (mobile/name)
  // without a $lookup into User on every list query, and preserves the
  // identity the application was made under even if the profile changes later.
  customerName: string;
  customerMobile: string;
  customerEmail: string;

  currentStage: string;
  status: RequestStatus;
  completionPercentage: number;
  priority: RequestPriority;

  assignedTo?: mongoose.Types.ObjectId;
  acceptedBy?: mongoose.Types.ObjectId;
  acceptedAt?: Date;
  documents: mongoose.Types.DocumentArray<IRequestDocument>;
  completionDocument?: ICompletionDocument;

  // Denormalized payment snapshot for fast list filtering ("show all with
  // pending payment") without joining the Payment collection on every read.
  // The Payment Engine module is the single writer of truth for these fields.
  paymentSummary: {
    totalAmount: number;
    paidAmount: number;
    status: PaymentSummaryStatus;
  };

  queueToken?: mongoose.Types.ObjectId; // set by the future Queue module
  appointment?: mongoose.Types.ObjectId; // set by the future Appointment module

  tags: string[];
  metadata?: Record<string, unknown>;

  appliedOn: Date;
  completedOn?: Date;
  deliveredOn?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const requestDocumentSchema = new Schema<IRequestDocument>(
  {
    type: { type: String, required: true },
    url: { type: String, required: true },
    fileId: { type: String, required: true },
    originalName: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    verificationStatus: {
      type: String,
      enum: Object.values(DocumentVerificationStatus),
      default: DocumentVerificationStatus.PENDING,
    },
    verificationRemark: String,
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const completionDocumentSchema = new Schema<ICompletionDocument>(
  {
    url: { type: String, required: true },
    fileId: { type: String, required: true },
    originalName: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    downloadPolicy: { type: String, enum: ['once', 'permanent'], default: 'permanent' },
    downloadCount: { type: Number, default: 0 },
    downloads: {
      type: [
        {
          downloadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          downloadedAt: { type: Date, default: Date.now },
          ipAddress: String,
        }
      ],
      default: []
    }
  },
  { _id: false }
);

const requestSchema = new Schema<IRequest>(
  {
    applicationNumber: { type: String, required: true, unique: true },

    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    formSubmission: { type: Schema.Types.ObjectId, ref: 'FormSubmission', required: true },
    workflow: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true },

    customerName: { type: String, required: true },
    customerMobile: { type: String, required: true },
    customerEmail: { type: String, required: true },

    currentStage: { type: String, required: true },
    status: { type: String, enum: Object.values(RequestStatus), default: RequestStatus.SUBMITTED, index: true },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    priority: { type: String, enum: Object.values(RequestPriority), default: RequestPriority.NORMAL },

    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    acceptedAt: { type: Date },
    documents: { type: [requestDocumentSchema], default: [] },
    completionDocument: { type: completionDocumentSchema },

    paymentSummary: {
      totalAmount: { type: Number, default: 0 },
      paidAmount: { type: Number, default: 0 },
      status: { type: String, enum: Object.values(PaymentSummaryStatus), default: PaymentSummaryStatus.PENDING },
    },

    queueToken: { type: Schema.Types.ObjectId, ref: 'QueueToken' },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },

    tags: { type: [String], default: [] },
    metadata: { type: Schema.Types.Mixed },

    appliedOn: { type: Date, default: Date.now },
    completedOn: Date,
    deliveredOn: Date,
  },
  { timestamps: true },
);

// ── Index strategy ──────────────────────────────────────────────────
// applicationNumber already unique-indexed above — the #1 lookup for
// public tracking, receipts, and QR codes.
// 1. Admin queue: filter by service + status, newest first.
requestSchema.index({ service: 1, status: 1, createdAt: -1 });
// 2. Staff workload view: "my assigned pending requests".
requestSchema.index({ assignedTo: 1, status: 1 });
// 3. Customer's own request history.
requestSchema.index({ customer: 1, createdAt: -1 });
// 4. Priority-sorted admin queue (VIP/urgent surfaced first).
requestSchema.index({ status: 1, priority: 1, createdAt: -1 });
// 5. Instant "search by mobile" (Smart Search requirement) — exact match, no scan.
requestSchema.index({ customerMobile: 1 });
// 6. Free-text search across application number + customer name.
requestSchema.index({ applicationNumber: 'text', customerName: 'text' });

export const Request: Model<IRequest> = mongoose.model<IRequest>('Request', requestSchema);
