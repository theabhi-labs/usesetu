import { IForm, IFormField, ConditionOperator, LAYOUT_ONLY_TYPES, FieldType } from '../models/form.model';

export interface FieldError {
  field: string;
  message: string;
}

const TYPE_PATTERNS: Partial<Record<FieldType, RegExp>> = {
  [FieldType.EMAIL]: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  [FieldType.MOBILE]: /^[6-9]\d{9}$/,
  [FieldType.AADHAAR]: /^\d{12}$/,
  [FieldType.PAN]: /^[A-Z]{5}\d{4}[A-Z]$/,
  [FieldType.PINCODE]: /^\d{6}$/,
};

/**
 * Evaluates a single condition against the current (in-progress) submission values.
 */
const evaluateCondition = (
  operator: ConditionOperator,
  actualValue: unknown,
  expectedValue: unknown,
): boolean => {
  switch (operator) {
    case ConditionOperator.EQUALS:
      return actualValue === expectedValue;
    case ConditionOperator.NOT_EQUALS:
      return actualValue !== expectedValue;
    case ConditionOperator.GREATER_THAN:
      return Number(actualValue) > Number(expectedValue);
    case ConditionOperator.LESS_THAN:
      return Number(actualValue) < Number(expectedValue);
    case ConditionOperator.GREATER_OR_EQUAL:
      return Number(actualValue) >= Number(expectedValue);
    case ConditionOperator.LESS_OR_EQUAL:
      return Number(actualValue) <= Number(expectedValue);
    case ConditionOperator.CONTAINS:
      return Array.isArray(actualValue)
        ? actualValue.includes(expectedValue)
        : String(actualValue ?? '').includes(String(expectedValue));
    case ConditionOperator.IN:
      return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
    case ConditionOperator.IS_EMPTY:
      return actualValue === undefined || actualValue === null || actualValue === '';
    case ConditionOperator.IS_NOT_EMPTY:
      return actualValue !== undefined && actualValue !== null && actualValue !== '';
    default:
      return false;
  }
};

/**
 * Determines whether a field is visible/required given the other submitted
 * values, by evaluating its conditional-logic rule (if any).
 * Runs server-side so a customer can never bypass conditional requirements
 * by manipulating the client (e.g. hiding a required upload via devtools).
 */
export const resolveFieldState = (
  field: IFormField,
  values: Record<string, unknown>,
): { visible: boolean; required: boolean } => {
  let visible = !field.hidden;
  let required = field.required;

  if (field.conditional && field.conditional.conditions.length > 0) {
    const results = field.conditional.conditions.map((cond) =>
      evaluateCondition(cond.operator, values[cond.field], cond.value),
    );
    const matched = field.conditional.logicType === 'OR' ? results.some(Boolean) : results.every(Boolean);

    switch (field.conditional.action) {
      case 'show':
        visible = matched;
        break;
      case 'hide':
        visible = !matched;
        break;
      case 'require':
        required = matched;
        break;
      case 'disable':
        // disabling doesn't change visibility/required — the field simply
        // isn't editable client-side; server still trusts the stored value.
        break;
    }
  }

  return { visible, required };
};

/**
 * Validates an entire submission payload against a form's field definitions.
 * Returns an array of field-level errors (empty = valid).
 */
export const validateSubmission = (form: IForm, values: Record<string, unknown>): FieldError[] => {
  const errors: FieldError[] = [];

  for (const field of form.fields) {
    if (LAYOUT_ONLY_TYPES.includes(field.type)) continue;

    const { visible, required } = resolveFieldState(field, values);
    if (!visible) continue; // hidden fields are never validated or trusted

    const value = values[field.fieldKey];
    const isEmpty = value === undefined || value === null || value === '';

    if (required && isEmpty) {
      errors.push({ field: field.fieldKey, message: `${field.label} is required` });
      continue;
    }
    if (isEmpty) continue; // optional and not provided — nothing further to check

    // Type-specific pattern (Aadhaar/PAN/Email/Mobile/Pincode)
    const typePattern = TYPE_PATTERNS[field.type];
    if (typePattern && !typePattern.test(String(value))) {
      errors.push({ field: field.fieldKey, message: field.validation?.customMessage || `${field.label} is invalid` });
      continue;
    }

    // Custom regex
    if (field.validation?.regex) {
      try {
        const re = new RegExp(field.validation.regex);
        if (!re.test(String(value))) {
          errors.push({
            field: field.fieldKey,
            message: field.validation.customMessage || `${field.label} format is invalid`,
          });
          continue;
        }
      } catch {
        // Malformed regex stored by admin — skip rather than 500 the request
      }
    }

    // Length / numeric range
    if (field.validation?.minLength !== undefined && String(value).length < field.validation.minLength) {
      errors.push({ field: field.fieldKey, message: `${field.label} is too short` });
    }
    if (field.validation?.maxLength !== undefined && String(value).length > field.validation.maxLength) {
      errors.push({ field: field.fieldKey, message: `${field.label} is too long` });
    }
    if (field.type === FieldType.NUMBER || field.type === FieldType.CURRENCY || field.type === FieldType.PERCENTAGE) {
      const num = Number(value);
      if (Number.isNaN(num)) {
        errors.push({ field: field.fieldKey, message: `${field.label} must be a number` });
      } else {
        if (field.validation?.min !== undefined && num < field.validation.min) {
          errors.push({ field: field.fieldKey, message: `${field.label} must be at least ${field.validation.min}` });
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          errors.push({ field: field.fieldKey, message: `${field.label} must be at most ${field.validation.max}` });
        }
      }
    }

    // Options-based fields — reject values not in the configured option list
    if ([FieldType.DROPDOWN, FieldType.RADIO].includes(field.type) && field.options.length > 0) {
      const allowed = field.options.map((o) => o.value);
      if (!allowed.includes(String(value))) {
        errors.push({ field: field.fieldKey, message: `${field.label} has an invalid selection` });
      }
    }
    if (field.type === FieldType.MULTISELECT && field.options.length > 0) {
      const allowed = field.options.map((o) => o.value);
      const selected = Array.isArray(value) ? value : [value];
      if (selected.some((v) => !allowed.includes(String(v)))) {
        errors.push({ field: field.fieldKey, message: `${field.label} has an invalid selection` });
      }
    }
  }

  return errors;
};

/**
 * Strips out any submitted value whose field is currently hidden (per
 * conditional logic) or that has no matching field definition at all —
 * defense in depth against payload tampering.
 */
export const sanitizeSubmissionValues = (
  form: IForm,
  rawValues: Record<string, unknown>,
): Record<string, unknown> => {
  const clean: Record<string, unknown> = {};
  for (const field of form.fields) {
    if (LAYOUT_ONLY_TYPES.includes(field.type)) continue;
    const { visible } = resolveFieldState(field, rawValues);
    if (visible && field.fieldKey in rawValues) {
      clean[field.fieldKey] = rawValues[field.fieldKey];
    }
  }
  return clean;
};
