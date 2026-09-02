import { tenantPlugin } from '../utils/tenantPlugin';
import mongoose, { Schema, Document, Model } from 'mongoose';

// ── Field Types ──────────────────────────────────────────────────────
export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  EMAIL = 'email',
  PHONE = 'phone',
  MOBILE = 'mobile',
  AADHAAR = 'aadhaar',
  PAN = 'pan',
  PASSPORT = 'passport',
  DRIVING_LICENCE = 'driving_licence',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
  DROPDOWN = 'dropdown',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  SWITCH = 'switch',
  RANGE = 'range',
  RATING = 'rating',
  COLOR = 'color',
  COUNTRY = 'country',
  STATE = 'state',
  DISTRICT = 'district',
  PINCODE = 'pincode',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  IMAGE_UPLOAD = 'image_upload',
  FILE_UPLOAD = 'file_upload',
  PDF_UPLOAD = 'pdf_upload',
  SIGNATURE = 'signature',
  OTP = 'otp',
  CAPTCHA = 'captcha',
  LOCATION = 'location',
  HIDDEN = 'hidden',
  HTML = 'html',
  DIVIDER = 'divider',
  HEADING = 'heading',
  PARAGRAPH = 'paragraph',
  REPEATABLE_GROUP = 'repeatable_group',
}

// Field types that never carry a submitted value (layout-only)
export const LAYOUT_ONLY_TYPES = [FieldType.HTML, FieldType.DIVIDER, FieldType.HEADING, FieldType.PARAGRAPH];

export enum FormStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ConditionOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'neq',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  GREATER_OR_EQUAL = 'gte',
  LESS_OR_EQUAL = 'lte',
  CONTAINS = 'contains',
  IN = 'in',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
}

interface ICondition {
  field: string; // fieldKey of the field being watched
  operator: ConditionOperator;
  value?: unknown;
}

interface IConditionalLogic {
  action: 'show' | 'hide' | 'require' | 'disable';
  logicType: 'AND' | 'OR';
  conditions: ICondition[];
}

interface IFieldOption {
  label: string;
  value: string;
  sortOrder: number;
}

interface IUploadConfig {
  allowedExtensions: string[];
  maxSizeMB: number;
  maxFiles: number;
  imagekitFolder?: string;
}

interface ICalculatedConfig {
  formula: string; // e.g. "{govtFee} + {cscFee}" — evaluated server-side, never trusted from client
  dependsOn: string[]; // fieldKeys this calculation reads
}

export interface IFormField {
  fieldKey: string; // stable identifier used in submissions, conditions, formulas (unique within the form)
  sectionKey: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  helpText?: string;
  order: number;

  required: boolean;
  readonly: boolean;
  hidden: boolean;
  disabled: boolean;
  unique: boolean; // enforce uniqueness across submissions for this service (e.g. one application per Aadhaar)
  searchable: boolean;
  filterable: boolean;

  defaultValue?: unknown;
  prefix?: string;
  suffix?: string;

  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    regex?: string;
    customMessage?: string;
  };

  options: IFieldOption[]; // dropdown / multiselect / checkbox / radio
  uploadConfig?: IUploadConfig;
  conditional?: IConditionalLogic;
  calculated?: ICalculatedConfig;
}

interface IFormSection {
  key: string;
  title: string;
  description?: string;
  order: number;
}

export interface IForm extends Document {
  service: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description?: string;

  // Versioning: formGroupId is stable across every version of "the same form".
  // A published form is immutable — editing it creates a new Form document
  // with the same formGroupId and version + 1. Existing FormSubmissions keep
  // pointing at the exact form(version) they were submitted against.
  formGroupId: mongoose.Types.ObjectId;
  version: number;
  status: FormStatus;

  sections: IFormSection[];
  fields: IFormField[];

  settings: {
    successMessage: string;
    redirectUrl?: string;
    notifyAdminEmail: boolean;
    notifyCustomerEmail: boolean;
    allowMultipleSubmissionsPerCustomer: boolean;
  };

  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const fieldOptionSchema = new Schema<IFieldOption>(
  { label: String, value: String, sortOrder: { type: Number, default: 0 } },
  { _id: false },
);

const conditionSchema = new Schema<ICondition>(
  {
    field: { type: String, required: true },
    operator: { type: String, enum: Object.values(ConditionOperator), required: true },
    value: Schema.Types.Mixed,
  },
  { _id: false },
);

const conditionalLogicSchema = new Schema<IConditionalLogic>(
  {
    action: { type: String, enum: ['show', 'hide', 'require', 'disable'], required: true },
    logicType: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    conditions: { type: [conditionSchema], default: [] },
  },
  { _id: false },
);

const formFieldSchema = new Schema<IFormField>(
  {
    fieldKey: { type: String, required: true },
    sectionKey: { type: String, required: true },
    type: { type: String, enum: Object.values(FieldType), required: true },
    label: { type: String, required: true },
    placeholder: String,
    description: String,
    helpText: String,
    order: { type: Number, default: 0 },

    required: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    unique: { type: Boolean, default: false },
    searchable: { type: Boolean, default: false },
    filterable: { type: Boolean, default: false },

    defaultValue: Schema.Types.Mixed,
    prefix: String,
    suffix: String,

    validation: {
      minLength: Number,
      maxLength: Number,
      min: Number,
      max: Number,
      regex: String,
      customMessage: String,
    },

    options: { type: [fieldOptionSchema], default: [] },
    uploadConfig: {
      allowedExtensions: [String],
      maxSizeMB: { type: Number, default: 5 },
      maxFiles: { type: Number, default: 1 },
      imagekitFolder: String,
    },
    conditional: conditionalLogicSchema,
    calculated: {
      formula: String,
      dependsOn: [String],
    },
  },
  { _id: false },
);

const formSectionSchema = new Schema<IFormSection>(
  {
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: String,
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const formSchema = new Schema<IForm>(
  {
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    description: String,

    formGroupId: { type: Schema.Types.ObjectId, required: true },
    version: { type: Number, default: 1 },
    status: { type: String, enum: Object.values(FormStatus), default: FormStatus.DRAFT },

    sections: { type: [formSectionSchema], default: [{ key: 'default', title: 'Details', order: 0 }] },
    fields: { type: [formFieldSchema], default: [] },

    settings: {
      successMessage: { type: String, default: 'Your application has been submitted successfully.' },
      redirectUrl: String,
      notifyAdminEmail: { type: Boolean, default: true },
      notifyCustomerEmail: { type: Boolean, default: true },
      allowMultipleSubmissionsPerCustomer: { type: Boolean, default: true },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

// ── Index strategy ──────────────────────────────────────────────────
// 1. The hot path: "give me the currently published form for this service".
//    Sorting by version desc + limit 1 with this index is an index-only scan.
formSchema.index({ service: 1, status: 1, version: -1 });
// 2. Fetch a specific version quickly (submissions reference formGroupId + version).
formSchema.index({ formGroupId: 1, version: -1 });
// 3. Public form access by slug — most recent published version.
formSchema.index({ slug: 1, status: 1, version: -1 });
formSchema.index({ deletedAt: 1 });

formSchema.pre(/^find/, function (this: mongoose.Query<unknown, IForm>, next) {
  if (this.getFilter().deletedAt === undefined && this.getOptions().withDeleted !== true) {
    this.where({ deletedAt: null });
  }
  next();
});

formSchema.plugin(tenantPlugin);

export const Form: Model<IForm> = mongoose.model<IForm>('Form', formSchema);
