import { z } from 'zod';
import { FieldType, ConditionOperator } from '../models/form.model';

const fieldOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  sortOrder: z.number().optional(),
});

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.nativeEnum(ConditionOperator),
  value: z.unknown().optional(),
});

const conditionalLogicSchema = z.object({
  action: z.enum(['show', 'hide', 'require', 'disable']),
  logicType: z.enum(['AND', 'OR']).default('AND'),
  conditions: z.array(conditionSchema).min(1),
});

const formFieldSchema = z.object({
  fieldKey: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'fieldKey must be alphanumeric/underscore, starting with a letter'),
  sectionKey: z.string().min(1),
  type: z.nativeEnum(FieldType),
  label: z.string().min(1).max(200),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  helpText: z.string().optional(),
  order: z.number().optional(),

  required: z.boolean().optional(),
  readonly: z.boolean().optional(),
  hidden: z.boolean().optional(),
  disabled: z.boolean().optional(),
  unique: z.boolean().optional(),
  searchable: z.boolean().optional(),
  filterable: z.boolean().optional(),

  defaultValue: z.unknown().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),

  validation: z
    .object({
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      regex: z.string().optional(),
      customMessage: z.string().optional(),
    })
    .optional(),

  options: z.array(fieldOptionSchema).optional(),
  uploadConfig: z
    .object({
      allowedExtensions: z.array(z.string()).optional(),
      maxSizeMB: z.number().optional(),
      maxFiles: z.number().optional(),
      imagekitFolder: z.string().optional(),
    })
    .optional(),
  conditional: conditionalLogicSchema.optional(),
  calculated: z
    .object({
      formula: z.string().optional(),
      dependsOn: z.array(z.string()).optional(),
    })
    .optional(),
});

// Guards against duplicate fieldKeys within the same form — a common
// source of silent data-loss bugs in dynamic form builders.
const uniqueFieldKeys = (fields: z.infer<typeof formFieldSchema>[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  for (const f of fields) {
    if (seen.has(f.fieldKey)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate fieldKey: ${f.fieldKey}` });
    }
    seen.add(f.fieldKey);
  }
};

const formSectionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().optional(),
});

export const createFormSchema = z.object({
  body: z.object({
    service: z.string().min(1, 'Service is required'),
    title: z.string().trim().min(2).max(200),
    description: z.string().optional(),
    sections: z.array(formSectionSchema).optional(),
    fields: z.array(formFieldSchema).superRefine(uniqueFieldKeys).optional(),
    settings: z
      .object({
        successMessage: z.string().optional(),
        redirectUrl: z.string().optional(),
        notifyAdminEmail: z.boolean().optional(),
        notifyCustomerEmail: z.boolean().optional(),
        allowMultipleSubmissionsPerCustomer: z.boolean().optional(),
      })
      .optional(),
  }),
});

export const updateFormSchema = z.object({
  body: createFormSchema.shape.body.partial(),
  params: z.object({ id: z.string().min(1) }),
});

export const formIdParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const submitFormSchema = z.object({
  body: z.object({
    values: z.record(z.string(), z.unknown()),
  }),
  params: z.object({ slug: z.string().min(1) }),
});
