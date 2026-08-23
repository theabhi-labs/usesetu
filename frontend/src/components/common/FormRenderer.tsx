import { useEffect, useRef, useState } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import type { Form, FormField, FieldType } from '../../types/form.types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Checkbox } from '../ui/Checkbox';
import { Card } from '../ui/Card';
import { cmsApi } from '../../services/cms.api';
import { lockerApi } from '../../services/locker.api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { UploadCloud, PenTool, X, Folder } from 'lucide-react';

interface FormRendererProps {
  formSchema: Form;
  onSubmit: (values: Record<string, unknown>) => void;
  isSubmitting: boolean;
  submitError?: string;
}

export function FormRenderer({ formSchema, onSubmit, isSubmitting, submitError }: FormRendererProps) {
  const methods = useForm({
    mode: 'onChange',
  });

  const handleFormSubmit = (data: any) => {
    // Filter out layout fields that shouldn't carry submitted values
    const cleanValues: Record<string, unknown> = {};
    formSchema.fields.forEach((field) => {
      if (!['html', 'divider', 'heading', 'paragraph'].includes(field.type)) {
        cleanValues[field.fieldKey] = data[field.fieldKey] ?? field.defaultValue;
      }
    });
    onSubmit(cleanValues);
  };

  // Sort sections and fields by order
  const sortedSections = [...formSchema.sections].sort((a, b) => a.order - b.order);
  const getFieldsForSection = (sectionKey: string) => {
    return formSchema.fields
      .filter((f) => f.sectionKey === sectionKey)
      .sort((a, b) => a.order - b.order);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleFormSubmit)} className="space-y-8 text-left">
        {submitError && (
          <div className="p-4 border border-error/20 bg-error/5 text-error rounded-md text-sm font-medium">
            {submitError}
          </div>
        )}

        <div className="space-y-8">
          {sortedSections.map((section) => (
            <Card key={section.key} className="p-6 space-y-6">
              <div className="border-b border-border pb-3">
                <h3 className="text-base font-bold text-text-primary">{section.title}</h3>
                {section.description && (
                  <p className="text-xs text-text-secondary mt-1">{section.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getFieldsForSection(section.key).map((field) => (
                  <FormFieldWrapper key={field.fieldKey} field={field} allFields={formSchema.fields} />
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting Form...' : formSchema.settings?.successMessage ? 'Submit Application' : 'Submit'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

function FormFieldWrapper({ field, allFields }: { field: FormField; allFields: FormField[] }) {
  const { watch, register, setValue, formState: { errors } } = useFormContext();
  const fieldValue = watch(field.fieldKey);

  // Watch fields needed for conditional checks
  const depFieldKeys = field.conditional?.conditions.map((c) => c.field) || [];
  const depFieldValues = watch(depFieldKeys);

  const [visibility, setVisibility] = useState(!field.hidden);
  const [isRequired, setIsRequired] = useState(field.required);
  const [isDisabled, setIsDisabled] = useState(field.disabled);

  // Conditional logic runner
  useEffect(() => {
    if (!field.conditional || field.conditional.conditions.length === 0) return;

    const { action, logicType, conditions } = field.conditional;

    const results = conditions.map((cond, idx) => {
      const val = depFieldValues[idx];
      return evaluateCondition(cond.operator, val, cond.value);
    });

    const isTriggered = logicType === 'AND'
      ? results.every((r) => r)
      : results.some((r) => r);

    if (action === 'show') {
      setVisibility(isTriggered);
    } else if (action === 'hide') {
      setVisibility(!isTriggered);
    } else if (action === 'require') {
      setIsRequired(isTriggered);
    } else if (action === 'disable') {
      setIsDisabled(isTriggered);
    }
  }, [depFieldValues, field.conditional, field.hidden, field.required, field.disabled]);

  if (!visibility) return null;

  // Handle Input Masking on change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let val = e.target.value;

    if (field.type === 'aadhaar') {
      // Numbers only, capped at 12, formatted in groups of 4: "XXXX XXXX XXXX"
      const digits = val.replace(/\D/g, '').slice(0, 12);
      const parts = [];
      for (let i = 0; i < digits.length; i += 4) {
        parts.push(digits.slice(i, i + 4));
      }
      val = parts.join(' ');
      setValue(field.fieldKey, val, { shouldValidate: true });
    } else if (field.type === 'pan') {
      // Uppercase letters and digits, formatted to standard 10 digit alphanumeric
      val = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10);
      setValue(field.fieldKey, val, { shouldValidate: true });
    } else {
      setValue(field.fieldKey, val, { shouldValidate: true });
    }
  };

  const getValidationRules = () => {
    const rules: Record<string, any> = {
      required: isRequired ? `${field.label} is required` : false,
    };

    if (field.validation) {
      const { minLength, maxLength, min, max, regex, customMessage } = field.validation;
      if (minLength) rules.minLength = { value: minLength, message: customMessage || `Minimum length is ${minLength}` };
      if (maxLength) rules.maxLength = { value: maxLength, message: customMessage || `Maximum length is ${maxLength}` };
      if (min) rules.min = { value: min, message: customMessage || `Minimum value is ${min}` };
      if (max) rules.max = { value: max, message: customMessage || `Maximum value is ${max}` };
      if (regex) {
        rules.pattern = {
          value: new RegExp(regex),
          message: customMessage || 'Invalid format',
        };
      }
    }

    // Default built-in validations based on type
    if (field.type === 'email') {
      rules.pattern = {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Invalid email address',
      };
    } else if (field.type === 'aadhaar') {
      rules.pattern = {
        value: /^\d{4}\s\d{4}\s\d{4}$/,
        message: 'Aadhaar must be exactly 12 digits (XXXX XXXX XXXX)',
      };
    } else if (field.type === 'pan') {
      rules.pattern = {
        value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
        message: 'PAN must match format: ABCDE1234F',
      };
    }

    return rules;
  };

  const renderFieldInput = () => {
    switch (field.type) {
      // Layout types
      case 'heading':
        return <h4 className="text-sm font-bold text-text-primary col-span-2 pt-2">{field.label}</h4>;
      case 'paragraph':
        return <p className="text-xs text-text-secondary col-span-2 leading-relaxed">{field.label}</p>;
      case 'divider':
        return <hr className="border-border col-span-2 my-2" />;

      // Text/Input Types
      case 'text':
      case 'email':
      case 'phone':
      case 'mobile':
      case 'aadhaar':
      case 'pan':
      case 'passport':
      case 'driving_licence':
      case 'country':
      case 'state':
      case 'district':
      case 'pincode':
      case 'currency': {
        const { onChange: RHFOnChange, ...RHFRegister } = register(field.fieldKey, getValidationRules());
        return (
          <Input
            id={field.fieldKey}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className={['aadhaar', 'pan', 'pincode'].includes(field.type) ? 'font-mono' : ''}
            {...RHFRegister}
            onChange={(e) => {
              handleInputChange(e);
              RHFOnChange(e);
            }}
          />
        );
      }

      case 'number':
      case 'range':
      case 'percentage':
        return (
          <Input
            id={field.fieldKey}
            type="number"
            placeholder={field.placeholder}
            disabled={isDisabled}
            {...register(field.fieldKey, {
              ...getValidationRules(),
              valueAsNumber: true,
            })}
          />
        );

      case 'textarea': {
        const { onChange: RHFOnChange, ...RHFRegister } = register(field.fieldKey, getValidationRules());
        return (
          <Textarea
            id={field.fieldKey}
            placeholder={field.placeholder}
            disabled={isDisabled}
            {...RHFRegister}
            onChange={(e) => {
              handleInputChange(e);
              RHFOnChange(e);
            }}
          />
        );
      }

      case 'dropdown':
        return (
          <Select id={field.fieldKey} disabled={isDisabled} {...register(field.fieldKey, getValidationRules())}>
            <option value="">{field.placeholder || 'Select option'}</option>
            {field.options
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
          </Select>
        );

      case 'radio':
        return (
          <div className="flex flex-wrap gap-4 pt-2">
            {field.options
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer">
                  <input
                    type="radio"
                    value={o.value}
                    disabled={isDisabled}
                    className="accent-accent h-4 w-4 bg-surface border-border focus:ring-accent"
                    {...register(field.fieldKey, getValidationRules())}
                  />
                  {o.label}
                </label>
              ))}
          </div>
        );

      case 'checkbox':
      case 'switch':
        return (
          <div className="pt-2">
            <Checkbox
              id={field.fieldKey}
              label={field.placeholder || field.label}
              disabled={isDisabled}
              {...register(field.fieldKey, getValidationRules())}
            />
          </div>
        );

      case 'date':
        return (
          <Input
            id={field.fieldKey}
            type="date"
            disabled={isDisabled}
            {...register(field.fieldKey, getValidationRules())}
          />
        );

      case 'file_upload':
      case 'image_upload':
      case 'pdf_upload':
        return <FileUploadField fieldKey={field.fieldKey} label={field.label} uploadConfig={field.uploadConfig} disabled={isDisabled} />;

      case 'signature':
        return <SignatureField fieldKey={field.fieldKey} disabled={isDisabled} />;

      default:
        return <Input id={field.fieldKey} disabled={isDisabled} {...register(field.fieldKey, getValidationRules())} />;
    }
  };

  const isLayoutType = ['html', 'divider', 'heading', 'paragraph'].includes(field.type);
  const isColSpanTwo = ['textarea', 'signature', 'divider', 'heading', 'paragraph', 'file_upload', 'image_upload', 'pdf_upload'].includes(field.type);

  return (
    <div className={`space-y-1.5 ${isColSpanTwo ? 'col-span-1 md:col-span-2' : 'col-span-1'}`}>
      {!isLayoutType && (
        <label htmlFor={field.fieldKey} className="text-xs font-bold text-text-secondary select-none flex items-center gap-1">
          {field.label}
          {isRequired && <span className="text-error font-mono">*</span>}
        </label>
      )}

      {renderFieldInput()}

      {!isLayoutType && errors[field.fieldKey] && (
        <p className="text-[10px] text-error font-medium">
          {String(errors[field.fieldKey]?.message || 'Invalid entry')}
        </p>
      )}
    </div>
  );
}

function evaluateCondition(operator: string, fieldValue: any, targetValue: any) {
  switch (operator) {
    case 'eq':
      return String(fieldValue ?? '') === String(targetValue ?? '');
    case 'neq':
      return String(fieldValue ?? '') !== String(targetValue ?? '');
    case 'gt':
      return Number(fieldValue || 0) > Number(targetValue || 0);
    case 'lt':
      return Number(fieldValue || 0) < Number(targetValue || 0);
    case 'gte':
      return Number(fieldValue || 0) >= Number(targetValue || 0);
    case 'lte':
      return Number(fieldValue || 0) <= Number(targetValue || 0);
    case 'contains':
      return String(fieldValue ?? '').toLowerCase().includes(String(targetValue ?? '').toLowerCase());
    case 'in':
      const list = Array.isArray(targetValue) ? targetValue : String(targetValue ?? '').split(',');
      return list.map(String).includes(String(fieldValue ?? ''));
    case 'is_empty':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';
    case 'is_not_empty':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    default:
      return false;
  }
}

function FileUploadField({ fieldKey, uploadConfig, disabled, label }: { fieldKey: string; uploadConfig?: any; disabled?: boolean; label: string }) {
  const { setValue, watch } = useFormContext();
  const fileUrl = watch(fieldKey);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isLockerOpen, setIsLockerOpen] = useState(false);
  const queryClient = useQueryClient();

  const lockerQuery = useQuery({
    queryKey: ['portalLockerDocumentsForm'],
    queryFn: () => lockerApi.getAll(),
  });

  const lockerDocs = lockerQuery.data || [];

  const getExpectedType = () => {
    const l = label.toLowerCase();
    if (l.includes('aadhaar')) return 'aadhaar';
    if (l.includes('pan')) return 'pan';
    if (l.includes('photo') || l.includes('photograph')) return 'photo';
    if (l.includes('sig') || l.includes('signature')) return 'signature';
    if (l.includes('ration')) return 'ration_card';
    if (l.includes('voter')) return 'voter_id';
    if (l.includes('passport')) return 'passport';
    if (l.includes('license') || l.includes('licence')) return 'driving_licence';
    return 'other';
  };

  const expectedType = getExpectedType();
  const matchingDoc = lockerDocs.find((doc) => doc.type === expectedType);

  const handleSelectFromLocker = (url: string) => {
    setValue(fieldKey, url, { shouldValidate: true });
    setIsLockerOpen(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = (uploadConfig?.maxSizeMB || 5) * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size exceeds limit of ${uploadConfig?.maxSizeMB || 5}MB`);
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', expectedType);

      // Upload directly to locker API (which auto-saves to locker)
      const res = await lockerApi.upload(formData);
      setValue(fieldKey, res.url, { shouldValidate: true });
      queryClient.invalidateQueries({ queryKey: ['portalLockerDocumentsForm'] });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {fileUrl ? (
        <div className="flex items-center justify-between p-3 border border-border bg-surface-elevated rounded-md text-xs font-mono">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-accent truncate hover:underline max-w-[80%]">
            {fileUrl}
          </a>
          <button type="button" onClick={() => setValue(fieldKey, '')} className="text-text-tertiary hover:text-error">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="space-y-3 text-left">
          {matchingDoc ? (
            <div className="p-3 bg-accent/5 border border-accent/10 rounded-md flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-accent tracking-wider block">Found in Locker</span>
                <span className="text-xs font-medium text-text-primary block truncate max-w-[200px]">{matchingDoc.originalName}</span>
              </div>
              <Button type="button" size="xs" onClick={() => handleSelectFromLocker(matchingDoc.url)}>
                Use from Locker
              </Button>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs flex-1"
              onClick={() => setIsLockerOpen(true)}
              disabled={disabled || isUploading}
            >
              <Folder size={12} className="mr-1.5" /> Select from Locker
            </Button>

            <label className={`border border-border hover:bg-surface-elevated/20 rounded-md px-3 py-2 text-center text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 flex-1 select-none ${disabled || isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <UploadCloud size={14} className="text-text-secondary" />
              <span>{isUploading ? 'Uploading...' : 'Upload New File'}</span>
              <input type="file" className="hidden" disabled={disabled || isUploading} onChange={handleUpload} />
            </label>
          </div>
        </div>
      )}
      {error && <p className="text-[10px] text-error font-medium">{error}</p>}

      <Dialog isOpen={isLockerOpen} onClose={() => setIsLockerOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select from Locker</DialogTitle>
          </DialogHeader>

          <div className="py-4 max-h-80 overflow-y-auto space-y-2">
            {lockerDocs.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center p-6 select-none">No documents in your locker yet.</p>
            ) : (
              lockerDocs.map((doc) => (
                <div key={doc._id} className="p-3 border border-border hover:border-accent rounded-md flex items-center justify-between gap-4 text-xs">
                  <div className="text-left space-y-0.5 max-w-[70%]">
                    <span className="font-bold text-text-primary block truncate">{doc.originalName}</span>
                    <span className="text-[9px] text-text-tertiary block font-mono">{doc.type.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <Button type="button" size="xs" onClick={() => handleSelectFromLocker(doc.url)}>
                    Select
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsLockerOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SignatureField({ fieldKey, disabled }: { fieldKey: string; disabled?: boolean }) {
  const { setValue, watch } = useFormContext();
  const signatureUrl = watch(fieldKey);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f5f5f5';
    return ctx;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || signatureUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;

    const ctx = getCanvasContext();
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || disabled || signatureUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = getCanvasContext();
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    saveSignature();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setValue(fieldKey, dataUrl, { shouldValidate: true });
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setValue(fieldKey, '', { shouldValidate: true });
  };

  return (
    <div className="space-y-2">
      {signatureUrl ? (
        <div className="relative border border-border rounded-md bg-surface p-2 flex justify-center items-center h-40">
          <img src={signatureUrl} alt="Signature Preview" className="h-full max-w-full object-contain" />
          <button type="button" onClick={clearSignature} className="absolute top-2 right-2 text-text-tertiary hover:text-error bg-surface p-1 rounded-full border border-border">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="relative border border-dashed border-border bg-surface/50 rounded-md overflow-hidden h-40">
            <canvas
              ref={canvasRef}
              width={560}
              height={160}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full cursor-crosshair touch-none"
            />
            <div className="absolute bottom-2 left-2 text-[9px] text-text-tertiary select-none font-mono flex items-center gap-1 uppercase">
              <PenTool size={10} /> DRAW SIGNATURE INSIDE BOX
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
