import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../services/notification.api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Play, Plus, Edit2, Trash2, Mail, Layers, Info } from 'lucide-react';

const EVENT_TYPES = [
  'customer.registered', 'request.created', 'request.stage_changed', 'request.completed',
  'payment.received', 'payment.refunded', 'document.uploaded',
  'queue.token_generated', 'appointment.booked',
] as const;

export function AutomationRules() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'rules' | 'templates'>('rules');

  // Rules states
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleEventType, setRuleEventType] = useState<string>(EVENT_TYPES[0]);
  const [rulePriority, setRulePriority] = useState(1);
  const [ruleActionType, setRuleActionType] = useState('email');
  const [ruleActionTemplateKey, setRuleActionTemplateKey] = useState('');
  const [ruleActionRecipient, setRuleActionRecipient] = useState('customer');
  const [ruleIsActive, setRuleIsActive] = useState(true);

  // Conditions list builder
  const [conditions, setConditions] = useState<{ field: string; operator: string; value: string }[]>([]);

  // Templates states
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [templateKey, setTemplateKey] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateBody, setTemplateBody] = useState('');

  // Queries
  const rulesQuery = useQuery({
    queryKey: ['adminRulesList'],
    queryFn: notificationApi.getRules,
    enabled: activeTab === 'rules',
  });

  const templatesQuery = useQuery({
    queryKey: ['adminTemplatesList'],
    queryFn: notificationApi.getTemplates,
  });

  const rules = rulesQuery.data || [];
  const templates = templatesQuery.data || [];

  // Sync templates selection
  useEffect(() => {
    if (templates.length > 0 && !ruleActionTemplateKey) {
      setRuleActionTemplateKey(templates[0].templateKey);
    }
  }, [templates, ruleActionTemplateKey]);

  // Mutations
  const saveRuleMutation = useMutation({
    mutationFn: (body: any) => {
      if (editingRule) {
        return notificationApi.updateRule(editingRule._id, body);
      } else {
        return notificationApi.createRule(body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRulesList'] });
      setIsRuleModalOpen(false);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => notificationApi.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRulesList'] });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (body: any) => notificationApi.upsertTemplate(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTemplatesList'] });
      setIsTemplateModalOpen(false);
    },
  });

  const handleRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;

    const payload = {
      name: ruleName,
      eventType: ruleEventType,
      priority: rulePriority,
      conditions: conditions.map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      })),
      actions: [
        {
          type: ruleActionType,
          templateKey: ruleActionTemplateKey,
          recipient: ruleActionRecipient,
        },
      ],
      isActive: ruleIsActive,
    };

    saveRuleMutation.mutate(payload);
  };

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateKey.trim() || !templateSubject.trim()) return;

    saveTemplateMutation.mutate({
      templateKey,
      subject: templateSubject,
      body: templateBody,
    });
  };

  const addCondition = () => {
    setConditions((prev) => [...prev, { field: '', operator: 'eq', value: '' }]);
  };

  const removeCondition = (idx: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, prop: string, val: string) => {
    setConditions((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [prop]: val } : c))
    );
  };

  // Live Template Placeholders Rendering Check
  const getTemplatePreview = () => {
    let preview = templateBody;
    const testData: Record<string, string> = {
      customerName: 'Abhishek Yadav',
      applicationNumber: 'CSC-2026-991823',
      serviceName: 'Aadhaar Card Enrollment',
      stageName: 'Document Verification',
      remarks: 'Documents verified successfully.',
      amount: '500',
    };

    Object.keys(testData).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      preview = preview.replace(regex, testData[key]);
    });

    return preview;
  };

  return (
    <div className="p-6 text-left space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Notification Automation</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Set up active triggers, rules conditions, and email layouts templates.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border text-xs select-none">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 border-b-2 font-medium transition-all cursor-pointer ${
            activeTab === 'rules'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Triggers Rules
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 border-b-2 font-medium transition-all cursor-pointer ${
            activeTab === 'templates'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Message Templates
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end select-none">
            <Button
              size="sm"
              onClick={() => {
                setEditingRule(null);
                setRuleName('');
                setRuleEventType(EVENT_TYPES[0]);
                setRulePriority(1);
                setRuleActionType('email');
                setRuleIsActive(true);
                setConditions([]);
                setIsRuleModalOpen(true);
              }}
            >
              <Plus size={13} className="mr-1" /> Add Automation Rule
            </Button>
          </div>

          {rulesQuery.isLoading ? (
            <Skeleton className="h-40 w-full animate-pulse" />
          ) : rules.length === 0 ? (
            <Card className="text-center p-8 border border-dashed border-border bg-surface select-none">
              <p className="text-xs text-text-tertiary">No automation rules configured.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rules.map((rule: any) => (
                <Card key={rule._id} className="p-4 flex flex-col justify-between items-start gap-4">
                  <div className="text-left space-y-1.5 w-full">
                    <div className="flex justify-between items-center gap-2 select-none">
                      <span className="font-bold text-xs text-text-primary block truncate">{rule.name}</span>
                      <Badge variant={rule.isActive ? 'success' : 'secondary'}>
                        {rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-text-tertiary block font-mono">
                      EVENT: {rule.eventType} (Priority {rule.priority})
                    </span>
                    {rule.actions?.map((act: any, i: number) => (
                      <span key={i} className="text-[9px] font-mono text-accent block uppercase">
                        ACTION: send {act.type} via template "{act.templateKey}" to {act.recipient}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 w-full justify-end border-t border-border pt-3 select-none">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingRule(rule);
                        setRuleName(rule.name);
                        setRuleEventType(rule.eventType);
                        setRulePriority(rule.priority || 1);
                        setRuleIsActive(rule.isActive);
                        setConditions(rule.conditions || []);
                        const act = rule.actions?.[0] || {};
                        setRuleActionType(act.type || 'email');
                        setRuleActionTemplateKey(act.templateKey || '');
                        setRuleActionRecipient(act.recipient || 'customer');
                        setIsRuleModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => deleteRuleMutation.mutate(rule._id)}
                      className="text-text-tertiary hover:text-error p-1.5 hover:bg-surface-elevated rounded cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-end select-none">
            <Button
              size="sm"
              onClick={() => {
                setEditingTemplate(null);
                setTemplateKey('');
                setTemplateSubject('');
                setTemplateBody('');
                setIsTemplateModalOpen(true);
              }}
            >
              <Plus size={13} className="mr-1" /> Add Template
            </Button>
          </div>

          {templatesQuery.isLoading ? (
            <Skeleton className="h-40 w-full animate-pulse" />
          ) : templates.length === 0 ? (
            <Card className="text-center p-8 border border-dashed border-border bg-surface select-none">
              <p className="text-xs text-text-tertiary">No message templates configured.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((tpl: any) => (
                <Card key={tpl._id} className="p-4 flex flex-col justify-between items-start gap-4">
                  <div className="text-left space-y-1.5 w-full">
                    <div className="flex items-center gap-1 text-xs font-bold text-text-primary select-none">
                      <Mail size={14} className="text-accent" /> {tpl.templateKey}
                    </div>
                    <span className="text-[10px] text-text-secondary block font-mono">SUBJECT: {tpl.subject}</span>
                    <p className="text-[10px] text-text-tertiary line-clamp-2 select-none">{tpl.body}</p>
                  </div>

                  <div className="flex gap-2 w-full justify-end border-t border-border pt-3 select-none">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setTemplateKey(tpl.templateKey);
                        setTemplateSubject(tpl.subject);
                        setTemplateBody(tpl.body);
                        setIsTemplateModalOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rules Modal */}
      <Dialog isOpen={isRuleModalOpen} onClose={() => setIsRuleModalOpen(false)}>
        <DialogContent className="max-w-xl p-6">
          <DialogHeader>
            <DialogTitle>Configure Automation Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRuleSubmit} className="space-y-4 pt-4 text-left text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Rule Name</label>
                <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Event Trigger</label>
                <Select value={ruleEventType} onChange={(e) => setRuleEventType(e.target.value)}>
                  {EVENT_TYPES.map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Conditions list */}
            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex justify-between items-center select-none">
                <label className="font-bold text-text-secondary">Execution Conditions (AND)</label>
                <button type="button" onClick={addCondition} className="text-accent font-bold">
                  + Add Condition
                </button>
              </div>

              {conditions.length === 0 ? (
                <p className="text-[10px] text-text-tertiary py-2 select-none">Rule executes unconditionally on matching event.</p>
              ) : (
                <div className="space-y-2">
                  {conditions.map((cond, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input
                        placeholder="FieldKey..."
                        value={cond.field}
                        onChange={(e) => updateCondition(idx, 'field', e.target.value)}
                        className="h-8 text-[10px]"
                        required
                      />
                      <Select
                        value={cond.operator}
                        onChange={(e) => updateCondition(idx, 'operator', e.target.value)}
                        className="h-8 text-[10px]"
                      >
                        <option value="eq">Equals</option>
                        <option value="neq">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="is_empty">Is Empty</option>
                        <option value="is_not_empty">Is Not Empty</option>
                      </Select>
                      <Input
                        placeholder="Value..."
                        value={cond.value}
                        onChange={(e) => updateCondition(idx, 'value', e.target.value)}
                        className="h-8 text-[10px]"
                      />
                      <button
                        type="button"
                        onClick={() => removeCondition(idx)}
                        className="text-text-tertiary hover:text-error font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action configs */}
            <div className="border-t border-border pt-3 grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Action</label>
                <Select value={ruleActionType} onChange={(e) => setRuleActionType(e.target.value)}>
                  <option value="email">Send Email</option>
                  <option value="in_app">Push Portal Alert</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Recipient</label>
                <Select value={ruleActionRecipient} onChange={(e) => setRuleActionRecipient(e.target.value)}>
                  <option value="customer">Customer</option>
                  <option value="staff">Staff Assigned</option>
                  <option value="admin">Administrators</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Attached Template</label>
                <Select
                  value={ruleActionTemplateKey}
                  onChange={(e) => setRuleActionTemplateKey(e.target.value)}
                >
                  <option value="">None</option>
                  {templates.map((tpl: any) => (
                    <option key={tpl.templateKey} value={tpl.templateKey}>
                      {tpl.templateKey}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="pt-2 select-none">
              <Checkbox
                id="ruleActive"
                label="Rule Active"
                checked={ruleIsActive}
                onChange={(e) => setRuleIsActive(e.target.checked)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRuleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveRuleMutation.isPending}>
                {saveRuleMutation.isPending ? 'Saving...' : 'Save Rule'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Templates Modal */}
      <Dialog isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader>
            <DialogTitle>Configure Message Template</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-left text-xs">
            {/* Editor form */}
            <form onSubmit={handleTemplateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Template Key ID</label>
                <Input
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value)}
                  placeholder="e.g. welcome_email"
                  disabled={!!editingTemplate}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Email Subject</label>
                <Input value={templateSubject} onChange={(e) => setTemplateSubject(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-text-secondary select-none">Template Body (supports {"{{placeholder}}"})</label>
                <Textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  rows={8}
                  placeholder="Hello {{customerName}}, your application {{applicationNumber}}..."
                  required
                />
              </div>

              <div className="flex gap-2 select-none">
                <Button type="button" variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveTemplateMutation.isPending}>
                  {saveTemplateMutation.isPending ? 'Upserting...' : 'Save Template'}
                </Button>
              </div>
            </form>

            {/* Preview pane */}
            <div className="space-y-4">
              <div className="flex items-center gap-1 font-bold text-text-secondary select-none uppercase tracking-wider">
                <Info size={14} className="text-accent" /> Live Interpolation Preview
              </div>
              <Card className="p-4 bg-surface-elevated/40 border-border space-y-3 min-h-[220px]">
                <div className="border-b border-border pb-2 text-[10px] text-text-secondary font-mono">
                  SUBJECT: {templateSubject}
                </div>
                <div className="text-xs text-text-primary leading-relaxed whitespace-pre-line font-sans">
                  {templateBody ? getTemplatePreview() : 'Start writing template body to check interpolations...'}
                </div>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
