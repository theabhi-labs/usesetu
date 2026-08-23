export type FieldType =
  | 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'mobile' | 'aadhaar' | 'pan'
  | 'passport' | 'driving_licence' | 'date' | 'time' | 'datetime' | 'dropdown'
  | 'multiselect' | 'checkbox' | 'radio' | 'switch' | 'range' | 'rating' | 'color'
  | 'country' | 'state' | 'district' | 'pincode' | 'currency' | 'percentage'
  | 'image_upload' | 'file_upload' | 'pdf_upload' | 'signature' | 'otp' | 'captcha'
  | 'location' | 'hidden' | 'html' | 'divider' | 'heading' | 'paragraph' | 'repeatable_group';

export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in' | 'is_empty' | 'is_not_empty';

export interface FormField {
  fieldKey: string;
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
  unique: boolean;
  defaultValue?: unknown;
  validation?: { minLength?: number; maxLength?: number; min?: number; max?: number; regex?: string; customMessage?: string };
  options: { label: string; value: string; sortOrder: number }[];
  uploadConfig?: { allowedExtensions: string[]; maxSizeMB: number; maxFiles: number };
  conditional?: {
    action: 'show' | 'hide' | 'require' | 'disable';
    logicType: 'AND' | 'OR';
    conditions: { field: string; operator: ConditionOperator; value?: unknown }[];
  };
}

export interface Form {
  _id: string;
  service: string;
  title: string;
  slug: string;
  formGroupId: string;
  version: number;
  status: 'draft' | 'published' | 'archived';
  sections: { key: string; title: string; description?: string; order: number }[];
  fields: FormField[];
  settings: {
    successMessage: string;
    redirectUrl?: string;
    notifyAdminEmail: boolean;
    notifyCustomerEmail: boolean;
    allowMultipleSubmissionsPerCustomer: boolean;
  };
}

export interface SubmitFormBody {
  values: Record<string, unknown>;
}

export interface SubmitFormResponse {
  submissionId: string;
  applicationNumber?: string;
}
