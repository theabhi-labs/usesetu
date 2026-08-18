import mongoose, { Schema, Document, Model } from 'mongoose';

export enum ServiceMode {
  FORM = 'form',
  QUEUE = 'queue',
  APPOINTMENT = 'appointment',
  WALK_IN = 'walk_in',
  HYBRID = 'hybrid',
}

export enum RequiredDocumentType {
  AADHAAR = 'aadhaar',
  PAN = 'pan',
  PHOTO = 'photo',
  SIGNATURE = 'signature',
  RATION_CARD = 'ration_card',
  VOTER_ID = 'voter_id',
  PASSPORT = 'passport',
  DRIVING_LICENCE = 'driving_licence',
  OTHER = 'other',
}

interface IFaq {
  question: string;
  answer: string;
}

interface IPaymentSettings {
  advancePayment: boolean;
  advanceAmount: number;
  allowPartialPayment: boolean;
  allowFullPayment: boolean;
  paymentBeforeProcessing: boolean;
}

export interface IService extends Document {
  category: mongoose.Types.ObjectId;
  name: string;
  slug: string;

  icon?: string;
  image?: {
    url: string;
    fileId: string;
  };
  description?: string;
  instructions?: string;

  serviceMode: ServiceMode;

  // Pricing — kept as separate fields (not a single "fee") so the frontend
  // can show an itemized breakdown without extra requests.
  serviceFee: number;
  govtFee: number;
  cscFee: number;

  estimatedTimeValue: number;
  estimatedTimeUnit: 'minutes' | 'hours' | 'days';
  workingDays: string[]; // ['mon','tue',...]

  requiredDocuments: RequiredDocumentType[];
  faqs: IFaq[];

  paymentSettings: IPaymentSettings;

  // Lightweight placeholder until the full Workflow Engine module is built.
  // Each entry is just a status key; the Workflow module will later replace
  // this with a `workflow` ObjectId reference without breaking existing data.
  customStatusWorkflow: string[];

  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  };

  sortOrder: number;
  status: 'active' | 'inactive';
  isFeatured: boolean;
  homepageVisibility: boolean;

  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const faqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const serviceSchema = new Schema<IService>(
  {
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true },

    icon: { type: String },
    image: {
      url: { type: String },
      fileId: { type: String },
    },
    description: { type: String, maxlength: 3000 },
    instructions: { type: String, maxlength: 5000 },

    serviceMode: { type: String, enum: Object.values(ServiceMode), default: ServiceMode.FORM },

    serviceFee: { type: Number, default: 0, min: 0 },
    govtFee: { type: Number, default: 0, min: 0 },
    cscFee: { type: Number, default: 0, min: 0 },

    estimatedTimeValue: { type: Number, default: 1, min: 0 },
    estimatedTimeUnit: { type: String, enum: ['minutes', 'hours', 'days'], default: 'days' },
    workingDays: {
      type: [String],
      default: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    },

    requiredDocuments: [{ type: String, enum: Object.values(RequiredDocumentType) }],
    faqs: { type: [faqSchema], default: [] },

    paymentSettings: {
      advancePayment: { type: Boolean, default: false },
      advanceAmount: { type: Number, default: 0, min: 0 },
      allowPartialPayment: { type: Boolean, default: false },
      allowFullPayment: { type: Boolean, default: true },
      paymentBeforeProcessing: { type: Boolean, default: true },
    },

    customStatusWorkflow: { type: [String], default: ['applied', 'processing', 'completed'] },

    seo: {
      title: { type: String },
      description: { type: String },
      keywords: [{ type: String }],
    },

    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    isFeatured: { type: Boolean, default: false },
    homepageVisibility: { type: Boolean, default: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

// ── Index strategy ──────────────────────────────────────────────────
// 1. category + status: the single most common query — "active services in
//    this category" for both the admin table and the public site.
serviceSchema.index({ category: 1, status: 1, sortOrder: 1 });
// 2. isFeatured + status: powers the homepage "Featured Services" carousel
//    without a collection scan.
serviceSchema.index({ isFeatured: 1, status: 1 });
// 3. homepageVisibility + status: homepage service grid.
serviceSchema.index({ homepageVisibility: 1, status: 1 });
// 4. slug already has a unique index from `unique: true` above (public service page lookup).
// 5. Text index for admin/public search across name + description.
serviceSchema.index({ name: 'text', description: 'text' });
// 6. Soft-delete filter — every list query excludes deleted docs; indexing
//    keeps that filter cheap even as the collection grows.
serviceSchema.index({ deletedAt: 1 });

// Exclude soft-deleted documents from all find queries unless explicitly overridden.
serviceSchema.pre(/^find/, function (this: mongoose.Query<unknown, IService>, next) {
  if (this.getFilter().deletedAt === undefined && this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
  next();
});

export const Service: Model<IService> = mongoose.model<IService>('Service', serviceSchema);
