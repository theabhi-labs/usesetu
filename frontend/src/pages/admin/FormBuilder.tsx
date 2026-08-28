import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formApi } from '../../services/form.api';
import { serviceApi } from '../../services/service.api';
import type { Form, FormField, FieldType, ConditionOperator } from '../../types/form.types';
import type { Service } from '../../types/service.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { Select } from '../../components/ui/Select';
import { Skeleton } from '../../components/ui/Skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { FormRenderer } from '../../components/common/FormRenderer';
import { ArrowLeft, Save, Play, Plus, Trash2, Eye, HelpCircle, ArrowUp, ArrowDown } from 'lucide-react';

const FIELD_PALETTE: { type: FieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Short Text', icon: '📝' },
  { type: 'textarea', label: 'Paragraph Text', icon: '📄' },
  { type: 'number', label: 'Number Input', icon: '🔢' },
  { type: 'email', label: 'Email', icon: '✉️' },
  { type: 'mobile', label: 'Mobile Number', icon: '📱' },
  { type: 'aadhaar', label: 'Aadhaar (Indian)', icon: '🆔' },
  { type: 'pan', label: 'PAN Card', icon: '💳' },
  { type: 'date', label: 'Date Selection', icon: '📅' },
  { type: 'dropdown', label: 'Drop Down Select', icon: '🔽' },
  { type: 'multiselect', label: 'Multi-Select', icon: '🗂️' },
  { type: 'checkbox', label: 'Check Box', icon: '☑️' },
  { type: 'radio', label: 'Radio Choice', icon: '🔘' },
  { type: 'file_upload', label: 'File Upload', icon: '📁' },
  { type: 'image_upload', label: 'Image Upload', icon: '🖼️' },
  { type: 'pdf_upload', label: 'PDF Document', icon: '📕' },
  { type: 'signature', label: 'Signature Pad', icon: '✒️' },
  { type: 'heading', label: 'Section Title (Heading)', icon: 'H' },
  { type: 'paragraph', label: 'Description Text (Info)', icon: 'P' },
  { type: 'divider', label: 'Layout Line (Divider)', icon: '―' },
];

export function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isNew = id === 'new';

  const [formState, setFormState] = useState<Partial<Form>>({
    title: 'New Service Form',
    service: '',
    sections: [{ key: 'section_1', title: 'Primary Details', order: 1 }],
    fields: [],
    settings: {
      successMessage: 'Application details captured successfully.',
      notifyAdminEmail: false,
      notifyCustomerEmail: true,
      allowMultipleSubmissionsPerCustomer: false,
    },
  });

  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Queries
  const servicesQuery = useQuery({
    queryKey: ['adminServicesList'],
    queryFn: () => serviceApi.getAll(1, 100),
  });

  const formQuery = useQuery({
    queryKey: ['adminFormDetail', id],
    queryFn: () => formApi.getById(id || ''),
    enabled: !isNew && !!id,
  });

  const services: Service[] = servicesQuery.data?.services || [];

  // Sync loaded form
  useEffect(() => {
    if (formQuery.data) {
      setFormState(formQuery.data);
      if (formQuery.data.fields?.length > 0) {
        setSelectedFieldKey(formQuery.data.fields[0].fieldKey);
      }
    }
  }, [formQuery.data]);

  // Set initial category service link
  useEffect(() => {
    if (isNew && services.length > 0 && !formState.service) {
      setFormState((prev) => ({ ...prev, service: services[0]._id }));
    }
  }, [services, isNew, formState.service]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: Partial<Form>) => {
      if (isNew) {
        return formApi.create(data);
      } else {
        return formApi.update(id || '', data);
      }
    },
    onSuccess: (savedForm) => {
      queryClient.invalidateQueries({ queryKey: ['adminFormsList'] });
      if (isNew) {
        navigate(location.search ? `/admin/forms/build/${savedForm._id}${location.search}` : `/admin/forms/build/${savedForm._id}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ['adminFormDetail', id] });
        setFormState(savedForm);
      }
      setSaveError('');
    },
    onError: (err: any) => {
      const details = err?.response?.data?.errors;
      if (Array.isArray(details) && details.length > 0) {
        const detailMsg = details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
        setSaveError(`Validation failed - ${detailMsg}`);
      } else {
        setSaveError(err?.response?.data?.message || 'Failed to save schema.');
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: (formId: string) => formApi.publish(formId),
    onSuccess: (savedForm) => {
      queryClient.invalidateQueries({ queryKey: ['adminFormsList'] });
      setFormState(savedForm);
    },
  });

  const handleSave = () => {
    if (!formState.title?.trim() || !formState.service) {
      setSaveError('Form Title and Service link are required.');
      return;
    }
    saveMutation.mutate(formState);
  };

  const addSection = () => {
    const nextIdx = (formState.sections?.length || 0) + 1;
    const newSec = {
      key: `section_${Date.now()}`,
      title: `Section ${nextIdx}`,
      order: nextIdx,
    };
    setFormState((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), newSec],
    }));
  };

  const removeSection = (secKey: string) => {
    if ((formState.sections?.length || 0) <= 1) return;
    setFormState((prev) => ({
      ...prev,
      sections: (prev.sections || []).filter((s) => s.key !== secKey),
      fields: (prev.fields || []).filter((f) => f.sectionKey !== secKey),
    }));
  };

  const updateSectionTitle = (secKey: string, val: string) => {
    setFormState((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((s) => (s.key === secKey ? { ...s, title: val } : s)),
    }));
  };

  const addField = (type: FieldType, sectionKey: string) => {
    const key = `field_${Date.now()}`;
    const nextOrder = (formState.fields?.filter((f) => f.sectionKey === sectionKey).length || 0) + 1;

    const newField: FormField = {
      fieldKey: key,
      sectionKey,
      type,
      label: `New ${type.replace('_', ' ')} input`,
      order: nextOrder,
      required: false,
      readonly: false,
      hidden: false,
      disabled: false,
      unique: false,
      options: [],
    };

    setFormState((prev) => ({
      ...prev,
      fields: [...(prev.fields || []), newField],
    }));
    setSelectedFieldKey(key);
  };

  const removeField = (key: string) => {
    setFormState((prev) => ({
      ...prev,
      fields: (prev.fields || []).filter((f) => f.fieldKey !== key),
    }));
    if (selectedFieldKey === key) {
      setSelectedFieldKey(null);
    }
  };

  const moveField = (key: string, direction: 'up' | 'down') => {
    const targetFld = formState.fields?.find((f) => f.fieldKey === key);
    if (!targetFld) return;

    const sectionFields = (formState.fields || [])
      .filter((f) => f.sectionKey === targetFld.sectionKey)
      .sort((a, b) => a.order - b.order);

    const index = sectionFields.findIndex((f) => f.fieldKey === key);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sectionFields.length) return;

    // Swap order property values
    const tempOrder = sectionFields[index].order;
    sectionFields[index].order = sectionFields[targetIdx].order;
    sectionFields[targetIdx].order = tempOrder;

    // Merge back
    const otherFields = (formState.fields || []).filter((f) => f.sectionKey !== targetFld.sectionKey);
    setFormState((prev) => ({
      ...prev,
      fields: [...otherFields, ...sectionFields],
    }));
  };

  const updateFieldProperty = (key: string, prop: keyof FormField, val: any) => {
    setFormState((prev) => ({
      ...prev,
      fields: (prev.fields || []).map((f) => (f.fieldKey === key ? { ...f, [prop]: val } : f)),
    }));
  };

  const selectedField = formState.fields?.find((f) => f.fieldKey === selectedFieldKey);

  if (formQuery.isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 animate-pulse" />
        <Skeleton className="h-64 w-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-10 select-none text-left">
        <div className="flex items-center gap-3">
          <Link to={location.search ? `/admin/forms${location.search}` : '/admin/forms'} className="text-text-secondary hover:text-text-primary">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-bold tracking-tight text-text-primary">{formState.title}</h1>
            <p className="text-[10px] text-text-tertiary font-mono">VERSION v{formState.version || 1} • {formState.status || 'DRAFT'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsPreviewOpen(true)}>
            <Eye size={13} className="mr-1" /> Live Preview
          </Button>
          {formState.status === 'draft' && !isNew && (
            <Button size="sm" variant="outline" className="text-success hover:bg-success/10 border-success/20" onClick={() => publishMutation.mutate(formState._id!)}>
              <Play size={13} className="mr-1" /> Publish live
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save size={13} className="mr-1" /> {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
          </Button>
        </div>
      </header>

      {saveError && (
        <div className="mx-6 mt-4 p-3 border border-error/20 bg-error/5 text-error rounded-md text-xs font-semibold">
          {saveError}
        </div>
      )}

      {formState.status === 'published' && (
        <div className="mx-6 mt-4 p-3 border border-warning/20 bg-warning/5 text-warning rounded-md text-xs font-semibold select-none text-left">
          ⚠️ WARNING: This form is Published and Live. Mutating these values will fork a new N+1 draft template.
        </div>
      )}

      {/* Builder workspace grid */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 items-stretch overflow-hidden">
        {/* Left Pane: Field Palette */}
        <div className="lg:col-span-1 border-r border-border bg-surface/50 p-4 space-y-4 overflow-y-auto select-none text-left">
          <div>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Field Palette</h3>
            <p className="text-[10px] text-text-tertiary mt-0.5">Click any component to append to target sections.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {FIELD_PALETTE.map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  const targetSec = formState.sections?.[0]?.key;
                  if (targetSec) addField(item.type, targetSec);
                }}
                className="p-3 border border-border bg-surface hover:border-accent hover:bg-surface-elevated/40 rounded text-center cursor-pointer transition-colors space-y-1"
              >
                <span className="block text-lg">{item.icon}</span>
                <span className="block text-[10px] font-medium text-text-secondary truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center Pane: Active Canvas */}
        <div className="lg:col-span-2 p-6 overflow-y-auto space-y-6 text-left">
          {/* Header configuration */}
          <Card className="p-4 space-y-3 bg-surface">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Form Title</label>
                <Input value={formState.title} onChange={(e) => setFormState({ ...formState, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Target Service Link</label>
                <Select
                  value={formState.service}
                  onChange={(e) => setFormState({ ...formState, service: e.target.value })}
                >
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {/* Section grids */}
          {formState.sections?.sort((a, b) => a.order - b.order).map((section) => {
            const sectionFields = (formState.fields || [])
              .filter((f) => f.sectionKey === section.key)
              .sort((a, b) => a.order - b.order);

            return (
              <Card key={section.key} className="p-5 border-border/80 space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <Input
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.key, e.target.value)}
                    className="border-none bg-transparent hover:bg-surface-elevated text-sm font-bold p-1 max-w-[200px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeSection(section.key)}
                    className="text-text-tertiary hover:text-error text-xs cursor-pointer select-none"
                  >
                    Delete Section
                  </button>
                </div>

                {/* Field listing */}
                <div className="space-y-2">
                  {sectionFields.length === 0 ? (
                    <div className="text-center p-6 border border-dashed border-border rounded text-xs text-text-tertiary select-none">
                      Canvas empty. Select palette elements to append fields here.
                    </div>
                  ) : (
                    sectionFields.map((field, idx) => {
                      const isSelected = selectedFieldKey === field.fieldKey;
                      return (
                        <div
                          key={field.fieldKey}
                          onClick={() => setSelectedFieldKey(field.fieldKey)}
                          className={`p-3 border rounded flex items-center justify-between gap-4 cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-accent bg-accent/5'
                              : 'border-border bg-surface-elevated/20 hover:bg-surface-elevated/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm">
                              {FIELD_PALETTE.find((p) => p.type === field.type)?.icon || '📝'}
                            </span>
                            <div>
                              <span className="font-semibold text-xs text-text-primary">{field.label}</span>
                              <span className="text-[10px] text-text-tertiary block font-mono">
                                key: {field.fieldKey} ({field.type})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 select-none">
                            <button
                              disabled={idx === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(field.fieldKey, 'up');
                              }}
                              className="p-1 hover:bg-surface-elevated text-text-tertiary hover:text-text-primary rounded cursor-pointer"
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              disabled={idx === sectionFields.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveField(field.fieldKey, 'down');
                              }}
                              className="p-1 hover:bg-surface-elevated text-text-tertiary hover:text-text-primary rounded cursor-pointer"
                            >
                              <ArrowDown size={11} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeField(field.fieldKey);
                              }}
                              className="p-1.5 hover:bg-surface-elevated text-text-tertiary hover:text-error rounded cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 text-left">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addField('text', section.key)}
                  >
                    <Plus size={12} className="mr-1" /> Add text input
                  </Button>
                </div>
              </Card>
            );
          })}

          <Button type="button" variant="outline" className="w-full" onClick={addSection}>
            <Plus size={14} className="mr-1.5" /> Add New Form Section
          </Button>
        </div>

        {/* Right Pane: Property Panel */}
        <div className="lg:col-span-1 border-l border-border bg-surface/50 p-4 space-y-4 overflow-y-auto text-left">
          {selectedField ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Field Properties</h3>
                <span className="text-[10px] text-text-tertiary font-mono">KEY: {selectedField.fieldKey}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Field Label</label>
                  <Input
                    value={selectedField.label}
                    onChange={(e) => updateFieldProperty(selectedField.fieldKey, 'label', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Placeholder Text</label>
                  <Input
                    value={selectedField.placeholder || ''}
                    onChange={(e) => updateFieldProperty(selectedField.fieldKey, 'placeholder', e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-text-secondary select-none">Description / Help Text</label>
                  <Textarea
                    value={selectedField.description || ''}
                    onChange={(e) => updateFieldProperty(selectedField.fieldKey, 'description', e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Checkbox
                    id="propRequired"
                    label="Required field"
                    checked={selectedField.required}
                    onChange={(e) => updateFieldProperty(selectedField.fieldKey, 'required', e.target.checked)}
                  />
                  <Checkbox
                    id="propReadonly"
                    label="Read Only input"
                    checked={selectedField.readonly}
                    onChange={(e) => updateFieldProperty(selectedField.fieldKey, 'readonly', e.target.checked)}
                  />
                  <Checkbox
                    id="propUnique"
                    label="Require unique submission value"
                    checked={selectedField.unique}
                    onChange={(e) => updateFieldProperty(selectedField.fieldKey, 'unique', e.target.checked)}
                  />
                </div>

                {/* Dropdown Options CRUD */}
                {['dropdown', 'radio', 'checkbox', 'multiselect'].includes(selectedField.type) && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-text-secondary select-none">Choice Options</label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = selectedField.options.length + 1;
                          const nextOpts = [
                            ...selectedField.options,
                            { label: `Option ${nextIdx}`, value: `opt_${Date.now()}`, sortOrder: nextIdx },
                          ];
                          updateFieldProperty(selectedField.fieldKey, 'options', nextOpts);
                        }}
                        className="text-accent text-[10px] font-bold cursor-pointer"
                      >
                        + Add Choice
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                      {selectedField.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-1.5 items-center">
                          <Input
                            placeholder="Label"
                            value={opt.label}
                            onChange={(e) => {
                              const nextOpts = [...selectedField.options];
                              nextOpts[idx].label = e.target.value;
                              updateFieldProperty(selectedField.fieldKey, 'options', nextOpts);
                            }}
                            className="h-7 text-[10px] py-0.5 px-2"
                          />
                          <Input
                            placeholder="Value"
                            value={opt.value}
                            onChange={(e) => {
                              const nextOpts = [...selectedField.options];
                              nextOpts[idx].value = e.target.value;
                              updateFieldProperty(selectedField.fieldKey, 'options', nextOpts);
                            }}
                            className="h-7 text-[10px] py-0.5 px-2 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const nextOpts = selectedField.options.filter((_, i) => i !== idx);
                              updateFieldProperty(selectedField.fieldKey, 'options', nextOpts);
                            }}
                            className="text-text-tertiary hover:text-error text-xs p-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-text-tertiary select-none">
              No field selected. Select an item in the canvas to inspect its validation schemas.
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)}>
        <DialogContent className="max-w-xl pr-6 pl-6 pt-4 pb-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Form Template Preview</DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            <FormRenderer
              formSchema={formState as Form}
              onSubmit={(vals) => console.log('Preview Submitted Values:', vals)}
              isSubmitting={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
