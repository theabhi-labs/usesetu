import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowApi } from '../../services/workflow.api';
import { serviceApi } from '../../services/service.api';
import type { Workflow, WorkflowStage, WorkflowTransition } from '../../types/workflow.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Skeleton } from '../../components/ui/Skeleton';
import { ArrowLeft, Save, Plus, ArrowUp, ArrowDown, Settings } from 'lucide-react';

export function WorkflowBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isNew = id === 'new';

  const [formState, setFormState] = useState<Partial<Workflow>>({
    name: 'New Custom Workflow',
    description: '',
    service: '',
    isDefault: false,
    status: 'draft',
    stages: [
      {
        key: 'submitted',
        title: 'Application Submitted',
        order: 1,
        completionPercentage: 10,
        statusType: 'initial',
        visibleToCustomer: true,
        visibleToAdmin: true,
        isFinal: false,
        color: '#FF6700',
        backgroundColor: '#FF670010',
        allowedRoles: ['customer', 'staff', 'admin'],
        requirements: {
          paymentRequired: false,
          documentVerificationRequired: false,
          tokenRequired: false,
          appointmentRequired: false,
        },
        notifyOnEnter: { customerEmail: true, customerInApp: true, adminEmail: false, adminInApp: false },
      },
    ],
    transitions: [],
  });

  const [selectedStageKey, setSelectedStageKey] = useState<string | null>('submitted');
  const [saveError, setSaveError] = useState('');

  // Queries
  const servicesQuery = useQuery({
    queryKey: ['adminServicesList'],
    queryFn: () => serviceApi.getAll(1, 100),
  });

  const workflowQuery = useQuery({
    queryKey: ['adminWorkflowDetail', id],
    queryFn: () => workflowApi.getById(id || ''),
    enabled: !isNew && !!id,
  });

  const services = servicesQuery.data?.services || [];

  // Pre-load from template state if passed
  useEffect(() => {
    if (isNew && location.state?.template) {
      const tpl = location.state.template;
      setFormState({
        name: tpl.name,
        description: tpl.description,
        service: '',
        isDefault: false,
        status: 'draft',
        stages: tpl.stages || [],
        transitions: tpl.transitions || [],
      });
      if (tpl.stages?.length > 0) {
        setSelectedStageKey(tpl.stages[0].key);
      }
    }
  }, [isNew, location.state]);

  // Sync details query
  useEffect(() => {
    if (workflowQuery.data) {
      setFormState(workflowQuery.data);
      if (workflowQuery.data.stages?.length > 0) {
        setSelectedStageKey(workflowQuery.data.stages[0].key);
      }
    }
  }, [workflowQuery.data]);

  // Bind initial service link
  useEffect(() => {
    if (isNew && services.length > 0 && !formState.service) {
      setFormState((prev) => ({ ...prev, service: services[0]._id }));
    }
  }, [services, isNew, formState.service]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: Partial<Workflow>) => {
      if (isNew) {
        return workflowApi.create(data);
      } else {
        return workflowApi.update(id || '', data);
      }
    },
    onSuccess: (savedWf) => {
      queryClient.invalidateQueries({ queryKey: ['adminWorkflowsList'] });
      if (isNew) {
        navigate(`/admin/workflows/build/${savedWf._id}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ['adminWorkflowDetail', id] });
        setFormState(savedWf);
      }
      setSaveError('');
    },
    onError: (err: any) => {
      setSaveError(err?.response?.data?.message || 'Failed to save workflow.');
    },
  });

  const handleSave = () => {
    if (!formState.name?.trim() || !formState.service) {
      setSaveError('Workflow Name and Attached Service are required.');
      return;
    }
    saveMutation.mutate(formState);
  };

  const addStage = () => {
    const nextIdx = (formState.stages?.length || 0) + 1;
    const key = `stage_${Date.now()}`;
    const newStage: WorkflowStage = {
      key,
      title: `Stage ${nextIdx}`,
      order: nextIdx,
      completionPercentage: Math.min(nextIdx * 20, 100),
      statusType: 'intermediate',
      visibleToCustomer: true,
      visibleToAdmin: true,
      isFinal: false,
      color: '#3B82F6',
      backgroundColor: '#3B82F610',
      allowedRoles: ['staff', 'admin'],
      requirements: {
        paymentRequired: false,
        documentVerificationRequired: false,
        tokenRequired: false,
        appointmentRequired: false,
      },
      notifyOnEnter: { customerEmail: true, customerInApp: true, adminEmail: false, adminInApp: false },
    };

    setFormState((prev) => ({
      ...prev,
      stages: [...(prev.stages || []), newStage],
    }));
    setSelectedStageKey(key);
  };

  const removeStage = (key: string) => {
    if ((formState.stages?.length || 0) <= 1) return;
    setFormState((prev) => ({
      ...prev,
      stages: (prev.stages || []).filter((s) => s.key !== key),
      transitions: (prev.transitions || []).filter((t) => t.fromStage !== key && t.toStage !== key),
    }));
    if (selectedStageKey === key) {
      const rem = (formState.stages || []).find((s) => s.key !== key);
      setSelectedStageKey(rem ? rem.key : null);
    }
  };

  const moveStage = (index: number, direction: 'up' | 'down') => {
    const nextStages = [...(formState.stages || [])].sort((a, b) => a.order - b.order);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextStages.length) return;

    // Swap order values
    const tempOrder = nextStages[index].order;
    nextStages[index].order = nextStages[targetIdx].order;
    nextStages[targetIdx].order = tempOrder;

    setFormState((prev) => ({ ...prev, stages: nextStages }));
  };

  const updateStageProperty = (key: string, prop: keyof WorkflowStage, val: any) => {
    setFormState((prev) => ({
      ...prev,
      stages: (prev.stages || []).map((s) => (s.key === key ? { ...s, [prop]: val } : s)),
    }));
  };

  const addTransition = () => {
    const list = formState.stages || [];
    if (list.length < 2) return;
    const newTrans: WorkflowTransition = {
      fromStage: list[0].key,
      toStage: list[1].key,
      label: 'Advance stage',
      allowedRoles: ['staff', 'admin'],
      requireRemark: false,
      isRejectTransition: false,
      isCancelTransition: false,
      isReopenTransition: false,
    };
    setFormState((prev) => ({
      ...prev,
      transitions: [...(prev.transitions || []), newTrans],
    }));
  };

  const removeTransition = (idx: number) => {
    setFormState((prev) => ({
      ...prev,
      transitions: (prev.transitions || []).filter((_, i) => i !== idx),
    }));
  };

  const updateTransitionProperty = (idx: number, prop: keyof WorkflowTransition, val: any) => {
    setFormState((prev) => ({
      ...prev,
      transitions: (prev.transitions || []).map((t, i) => (i === idx ? { ...t, [prop]: val } : t)),
    }));
  };

  const selectedStage = formState.stages?.find((s) => s.key === selectedStageKey);

  if (workflowQuery.isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 animate-pulse" />
        <Skeleton className="h-64 w-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0 z-10 select-none text-left">
        <div className="flex items-center gap-3">
          <Link to="/admin/workflows" className="text-text-secondary hover:text-text-primary">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-base font-bold tracking-tight text-text-primary">{formState.name}</h1>
            <p className="text-[10px] text-text-tertiary font-mono">PIPELINE CONFIGURATION • {formState.status || 'DRAFT'}</p>
          </div>
        </div>

        <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
          <Save size={13} className="mr-1" /> {saveMutation.isPending ? 'Saving...' : 'Save Draft'}
        </Button>
      </header>

      {saveError && (
        <div className="mx-6 mt-4 p-3 border border-error/20 bg-error/5 text-error rounded-md text-xs font-semibold">
          {saveError}
        </div>
      )}

      {/* Main Grid Workspace */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 items-stretch overflow-hidden">
        {/* Left 3 columns: Stages Canvas & Configuration */}
        <div className="lg:col-span-3 p-6 overflow-y-auto space-y-6 text-left">
          {/* Header parameters */}
          <Card className="p-4 space-y-3 bg-surface">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Workflow Name</label>
                <Input value={formState.name} onChange={(e) => setFormState({ ...formState, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-secondary uppercase">Link Service</label>
                <Select
                  value={formState.service}
                  onChange={(e) => setFormState({ ...formState, service: e.target.value })}
                >
                  {(services as any[]).map((s: any) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="pt-2 select-none">
                <Checkbox
                  id="isDefault"
                  label="Enforce as Default Service Path"
                  checked={formState.isDefault}
                  onChange={(e) => setFormState({ ...formState, isDefault: e.target.checked })}
                />
              </div>
            </div>
          </Card>

          {/* Stages Layout */}
          <div className="space-y-4">
            <div className="flex justify-between items-center select-none">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Stages Milestones</h3>
              <Button size="sm" variant="outline" onClick={addStage}>
                <Plus size={12} className="mr-1" /> Add Stage Node
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {formState.stages?.sort((a, b) => a.order - b.order).map((stage, idx) => {
                const isSelected = selectedStageKey === stage.key;
                const isFirst = idx === 0;
                const isLast = idx === (formState.stages?.length || 0) - 1;

                return (
                  <Card
                    key={stage.key}
                    onClick={() => setSelectedStageKey(stage.key)}
                    className={`p-4 flex flex-col justify-between gap-4 cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? 'border-accent bg-accent/5'
                        : 'border-border bg-surface'
                    }`}
                    style={{ borderLeftColor: stage.color || 'var(--color-border)' }}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-xs text-text-primary">{stage.title}</span>
                        <span className="text-[9px] font-mono text-text-tertiary">order: {stage.order}</span>
                      </div>
                      <span className="text-[10px] text-text-secondary block font-mono">key: {stage.key}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-2 border-t border-border select-none">
                      <div className="flex items-center gap-1">
                        <button
                          disabled={isFirst}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStage(idx, 'up');
                          }}
                          className="p-1 hover:bg-surface-elevated text-text-tertiary hover:text-text-primary disabled:opacity-30 rounded cursor-pointer"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          disabled={isLast}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveStage(idx, 'down');
                          }}
                          className="p-1 hover:bg-surface-elevated text-text-tertiary hover:text-text-primary disabled:opacity-30 rounded cursor-pointer"
                        >
                          <ArrowDown size={11} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStage(stage.key);
                        }}
                        className="text-text-tertiary hover:text-error"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Stage Editor (If selected) */}
          {selectedStage && (
            <Card className="p-5 border-border/80 space-y-4">
              <div className="flex items-center gap-1.5 border-b border-border pb-3 text-text-secondary select-none">
                <Settings size={14} className="text-accent" />
                <h4 className="font-bold text-xs uppercase tracking-wider">Configure Stage Node: {selectedStage.title}</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary select-none">Stage Title</label>
                  <Input
                    value={selectedStage.title}
                    onChange={(e) => updateStageProperty(selectedStage.key, 'title', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary select-none">Completion Percentage (0-100)</label>
                  <Input
                    type="number"
                    value={selectedStage.completionPercentage}
                    onChange={(e) => updateStageProperty(selectedStage.key, 'completionPercentage', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary select-none">Status Type</label>
                  <Select
                    value={selectedStage.statusType}
                    onChange={(e) => updateStageProperty(selectedStage.key, 'statusType', e.target.value)}
                  >
                    <option value="initial">Initial</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="final">Final / Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none">
                {/* Requirements check */}
                <div className="space-y-2 border border-border p-4 rounded bg-surface-elevated/10">
                  <span className="text-[10px] font-bold text-text-secondary uppercase block">Requirements Verification Gates</span>
                  <div className="flex flex-col gap-2 pt-2">
                    <Checkbox
                      id="reqPay"
                      label="Enforce advance payment check"
                      checked={selectedStage.requirements?.paymentRequired || false}
                      onChange={(e) =>
                        updateStageProperty(selectedStage.key, 'requirements', {
                          ...(selectedStage.requirements || {}),
                          paymentRequired: e.target.checked,
                        })
                      }
                    />
                    <Checkbox
                      id="reqDocs"
                      label="Enforce documents verification check"
                      checked={selectedStage.requirements?.documentVerificationRequired || false}
                      onChange={(e) =>
                        updateStageProperty(selectedStage.key, 'requirements', {
                          ...(selectedStage.requirements || {}),
                          documentVerificationRequired: e.target.checked,
                        })
                      }
                    />
                    <Checkbox
                      id="reqToken"
                      label="Enforce counter queue token check"
                      checked={selectedStage.requirements?.tokenRequired || false}
                      onChange={(e) =>
                        updateStageProperty(selectedStage.key, 'requirements', {
                          ...(selectedStage.requirements || {}),
                          tokenRequired: e.target.checked,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Notifications setup */}
                <div className="space-y-2 border border-border p-4 rounded bg-surface-elevated/10">
                  <span className="text-[10px] font-bold text-text-secondary uppercase block">Milestone Notifications Triggers</span>
                  <div className="flex flex-col gap-2 pt-2">
                    <Checkbox
                      id="notifCustomerMail"
                      label="Send email update to Customer"
                      checked={selectedStage.notifyOnEnter?.customerEmail || false}
                      onChange={(e) =>
                        updateStageProperty(selectedStage.key, 'notifyOnEnter', {
                          ...(selectedStage.notifyOnEnter || {}),
                          customerEmail: e.target.checked,
                        })
                      }
                    />
                    <Checkbox
                      id="notifCustomerApp"
                      label="Send portal notification to Customer"
                      checked={selectedStage.notifyOnEnter?.customerInApp || false}
                      onChange={(e) =>
                        updateStageProperty(selectedStage.key, 'notifyOnEnter', {
                          ...(selectedStage.notifyOnEnter || {}),
                          customerInApp: e.target.checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Right Pane: Transitions Editor */}
        <div className="lg:col-span-1 border-l border-border bg-surface/50 p-4 space-y-4 overflow-y-auto text-left">
          <div className="flex justify-between items-center border-b border-border pb-3 select-none">
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Transitions Rules</h3>
              <p className="text-[10px] text-text-tertiary mt-0.5">Control allowable action jumps.</p>
            </div>
            <button type="button" onClick={addTransition} className="text-accent text-xs font-bold cursor-pointer">
              + Rule
            </button>
          </div>

          {formState.transitions?.length === 0 ? (
            <p className="text-xs text-text-tertiary select-none">No active transitions defined.</p>
          ) : (
            <div className="space-y-4">
              {formState.transitions?.map((trans, idx) => (
                <div key={idx} className="p-3 border border-border bg-surface rounded-md space-y-3 relative text-xs">
                  <button
                    type="button"
                    onClick={() => removeTransition(idx)}
                    className="absolute top-2 right-2 text-text-tertiary hover:text-error cursor-pointer font-bold select-none"
                  >
                    ✕
                  </button>

                  <div className="space-y-1.5">
                    <label className="font-bold text-text-secondary select-none">Action Label</label>
                    <Input
                      value={trans.label}
                      onChange={(e) => updateTransitionProperty(idx, 'label', e.target.value)}
                      className="h-7 text-[10px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="font-bold text-text-secondary select-none">From Stage</label>
                      <Select
                        value={trans.fromStage}
                        onChange={(e) => updateTransitionProperty(idx, 'fromStage', e.target.value)}
                        className="h-7 text-[10px]"
                      >
                        {formState.stages?.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-bold text-text-secondary select-none">To Stage</label>
                      <Select
                        value={trans.toStage}
                        onChange={(e) => updateTransitionProperty(idx, 'toStage', e.target.value)}
                        className="h-7 text-[10px]"
                      >
                        {formState.stages?.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1 select-none">
                    <Checkbox
                      id={`transRemark-${idx}`}
                      label="Require staff remarks log"
                      checked={trans.requireRemark}
                      onChange={(e) => updateTransitionProperty(idx, 'requireRemark', e.target.checked)}
                    />
                    <Checkbox
                      id={`transReject-${idx}`}
                      label="Enforce as Reject Step"
                      checked={trans.isRejectTransition}
                      onChange={(e) => updateTransitionProperty(idx, 'isRejectTransition', e.target.checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
