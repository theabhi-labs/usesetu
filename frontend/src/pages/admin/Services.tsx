import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceApi } from '../../services/service.api';
import { categoryApi } from '../../services/category.api';
import type { Service, ServiceMode, RequiredDocumentType } from '../../types/service.types';
import type { Category } from '../../types/category.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Checkbox } from '../../components/ui/Checkbox';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export function Services() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Dialog & Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formTab, setFormTab] = useState<'general' | 'pricing' | 'mode' | 'docs' | 'faqs' | 'payment'>('general');
  const [saveError, setSaveError] = useState('');

  // Form Field States
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('');
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [serviceFee, setServiceFee] = useState(0);
  const [govtFee, setGovtFee] = useState(0);
  const [cscFee, setCscFee] = useState(0);
  const [serviceMode, setServiceMode] = useState<ServiceMode>('form');
  const [estimatedTimeValue, setEstimatedTimeValue] = useState(1);
  const [estimatedTimeUnit, setEstimatedTimeUnit] = useState<'minutes' | 'hours' | 'days'>('days');
  const [workingDays, setWorkingDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocumentType[]>([]);
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isFeatured, setIsFeatured] = useState(false);
  const [homepageVisibility, setHomepageVisibility] = useState(true);

  // Payment settings
  const [advancePayment, setAdvancePayment] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [allowPartialPayment, setAllowPartialPayment] = useState(false);
  const [allowFullPayment, setAllowFullPayment] = useState(true);
  const [paymentBeforeProcessing, setPaymentBeforeProcessing] = useState(true);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Live slug preview
  useEffect(() => {
    if (!editingService) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [name, editingService]);

  // Queries
  const categoriesQuery = useQuery({
    queryKey: ['adminCategories'],
    queryFn: () => categoryApi.getAll(1, 100),
  });

  const categories: Category[] = categoriesQuery.data?.categories || [];

  const servicesQuery = useQuery({
    queryKey: ['adminServices', page, limit, debouncedSearch, filterCategory, filterMode, filterStatus],
    queryFn: () =>
      serviceApi.getAll(page, limit, {
        search: debouncedSearch,
        category: filterCategory,
        serviceMode: filterMode,
        status: filterStatus,
      }),
  });

  const services: Service[] = servicesQuery.data?.services || [];
  const pagination = servicesQuery.data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: Partial<Service>) => {
      if (editingService) {
        return serviceApi.update(editingService._id, data);
      } else {
        return serviceApi.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminServices'] });
      setIsModalOpen(false);
      resetForm();
      setSaveError('');
    },
    onError: (err: any) => {
      const errDetails = err?.response?.data?.errors?.map((e: any) => `${e.field}: ${e.message}`).join(', ') || '';
      setSaveError((err?.response?.data?.message || 'Failed to save service') + (errDetails ? ` (${errDetails})` : ''));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serviceApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminServices'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (id: string) => serviceApi.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminServices'] });
    },
  });

  const featuredMutation = useMutation({
    mutationFn: (id: string) => serviceApi.toggleFeatured(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminServices'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => serviceApi.reorder(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminServices'] });
    },
  });

  const resetForm = () => {
    setEditingService(null);
    setSaveError('');
    setFormTab('general');
    setName('');
    setSlug('');
    setCategory('');
    setIcon('');
    setDescription('');
    setInstructions('');
    setServiceFee(0);
    setGovtFee(0);
    setCscFee(0);
    setServiceMode('form');
    setEstimatedTimeValue(1);
    setEstimatedTimeUnit('days');
    setWorkingDays(['mon', 'tue', 'wed', 'thu', 'fri']);
    setRequiredDocuments([]);
    setFaqs([]);
    setSeoTitle('');
    setSeoDescription('');
    setSeoKeywords('');
    setStatus('active');
    setIsFeatured(false);
    setHomepageVisibility(true);
    setAdvancePayment(false);
    setAdvanceAmount(0);
    setAllowPartialPayment(false);
    setAllowFullPayment(true);
    setPaymentBeforeProcessing(true);
  };

  const handleEdit = (srv: Service) => {
    setEditingService(srv);
    setFormTab('general');
    setName(srv.name);
    setSlug(srv.slug);
    setCategory(typeof srv.category === 'object' && srv.category ? (srv.category as any)._id : srv.category || '');
    setIcon(srv.icon || '');
    setDescription(srv.description || '');
    setInstructions(srv.instructions || '');
    setServiceFee(srv.serviceFee || 0);
    setGovtFee(srv.govtFee || 0);
    setCscFee(srv.cscFee || 0);
    setServiceMode(srv.serviceMode || 'form');
    setEstimatedTimeValue(srv.estimatedTimeValue || 1);
    setEstimatedTimeUnit(srv.estimatedTimeUnit || 'days');
    setWorkingDays(srv.workingDays || []);
    setRequiredDocuments(srv.requiredDocuments || []);
    setFaqs(srv.faqs || []);
    setSeoTitle(srv.seo?.title || '');
    setSeoDescription(srv.seo?.description || '');
    setSeoKeywords(srv.seo?.keywords?.join(', ') || '');
    setStatus(srv.status || 'active');
    setIsFeatured(srv.isFeatured || false);
    setHomepageVisibility(srv.homepageVisibility ?? true);

    // Payments
    setAdvancePayment(srv.paymentSettings?.advancePayment || false);
    setAdvanceAmount(srv.paymentSettings?.advanceAmount || 0);
    setAllowPartialPayment(srv.paymentSettings?.allowPartialPayment || false);
    setAllowFullPayment(srv.paymentSettings?.allowFullPayment ?? true);
    setPaymentBeforeProcessing(srv.paymentSettings?.paymentBeforeProcessing ?? true);

    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    if (categories.length > 0) setCategory(categories[0]._id);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category) return;

    const payload: Partial<Service> = {
      name,
      slug,
      category,
      icon,
      description,
      instructions,
      serviceFee,
      govtFee,
      cscFee,
      serviceMode,
      estimatedTimeValue,
      estimatedTimeUnit,
      workingDays,
      requiredDocuments,
      faqs,
      paymentSettings: {
        advancePayment,
        advanceAmount,
        allowPartialPayment,
        allowFullPayment,
        paymentBeforeProcessing,
      },
      seo: {
        title: seoTitle,
        description: seoDescription,
        keywords: seoKeywords.split(',').map((k) => k.trim()).filter(Boolean),
      },
      status,
      isFeatured,
      homepageVisibility,
    };

    saveMutation.mutate(payload);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= services.length) return;

    const ids = services.map((s) => s._id);
    const temp = ids[index];
    ids[index] = ids[targetIdx];
    ids[targetIdx] = temp;

    reorderMutation.mutate(ids);
  };

  // repeatable FAQs add/remove
  const addFaqRow = () => setFaqs((prev) => [...prev, { question: '', answer: '' }]);
  const removeFaqRow = (idx: number) => setFaqs((prev) => prev.filter((_, i) => i !== idx));
  const updateFaqRow = (idx: number, fieldName: 'question' | 'answer', val: string) => {
    setFaqs((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [fieldName]: val } : item))
    );
  };

  const handleDocTypeToggle = (docType: RequiredDocumentType) => {
    setRequiredDocuments((prev) =>
      prev.includes(docType) ? prev.filter((d) => d !== docType) : [...prev, docType]
    );
  };

  const handleDayToggle = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const documentTypes: RequiredDocumentType[] = [
    'aadhaar', 'pan', 'photo', 'signature', 'ration_card',
    'voter_id', 'passport', 'driving_licence', 'other'
  ];

  const daysOfWeek = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];

  return (
    <div className="p-6 text-left space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Services Catalogue</h1>
          <p className="text-xs text-text-secondary mt-0.5 select-none">Configure modes, pricing fees, required verification documents, and slot limits.</p>
        </div>
        <Button size="sm" onClick={handleOpenCreateModal}>
          <Plus size={14} className="mr-1.5" /> New Service
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Search services</label>
          <div className="relative">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Category</label>
          <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-9 text-xs">
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Service Mode</label>
          <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="h-9 text-xs">
            <option value="">All Modes</option>
            <option value="form">Online Form</option>
            <option value="queue">Queue counter</option>
            <option value="appointment">Appointment booking</option>
            <option value="walk_in">Walk-in</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-text-secondary font-bold uppercase select-none">Status</label>
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 text-xs">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      {servicesQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <Card className="text-center p-12 border border-dashed border-border bg-surface">
          <p className="text-sm text-text-secondary mb-4 select-none">No services found matching filters.</p>
          <Button size="sm" onClick={handleOpenCreateModal}>Add First Service</Button>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Service Name</TH>
                <TH>Category</TH>
                <TH>Mode</TH>
                <TH className="text-right">Total Fee</TH>
                <TH className="text-center">Status</TH>
                <TH className="text-center">Featured</TH>
                <TH className="text-center">Order</TH>
                <th className="text-right py-3 px-4 font-medium uppercase tracking-wider select-none text-[10px]">Actions</th>
              </TR>
            </THead>
            <TBody>
              {services.map((srv, index) => {
                const catId = typeof srv.category === 'object' && srv.category ? (srv.category as any)._id : srv.category;
                const catObj = categories.find((c) => c._id === catId);
                const isFirst = page === 1 && index === 0;
                const isLast = page === pagination.totalPages && index === services.length - 1;

                return (
                  <TR key={srv._id}>
                    <TD className="font-semibold text-text-primary">
                      <span className="mr-1">{srv.icon || '⚡'}</span>
                      {srv.name}
                    </TD>
                    <TD className="text-text-secondary">{catObj?.name || 'Unassigned'}</TD>
                    <TD>
                      <span className="text-[10px] font-mono bg-border-strong text-text-primary px-2 py-0.5 rounded uppercase">
                        {srv.serviceMode}
                      </span>
                    </TD>
                    <TD className="text-right font-mono font-bold text-text-primary">
                      ₹{(srv.serviceFee || 0) + (srv.govtFee || 0) + (srv.cscFee || 0)}
                    </TD>
                    <TD className="text-center">
                      <button
                        onClick={() => statusMutation.mutate(srv._id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full select-none cursor-pointer border ${
                          srv.status === 'active'
                            ? 'bg-success/10 border-success/20 text-success'
                            : 'bg-border-strong border-border-strong text-text-tertiary'
                        }`}
                      >
                        {srv.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                      </button>
                    </TD>
                    <TD className="text-center">
                      <button
                        onClick={() => featuredMutation.mutate(srv._id)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full select-none cursor-pointer border ${
                          srv.isFeatured
                            ? 'bg-accent/10 border-accent/20 text-accent'
                            : 'bg-border-strong border-border-strong text-text-tertiary'
                        }`}
                      >
                        {srv.isFeatured ? 'FEATURED' : 'NORMAL'}
                      </button>
                    </TD>
                    <TD className="text-center">
                      <div className="flex justify-center items-center gap-1 select-none">
                        <button
                          disabled={isFirst}
                          onClick={() => handleMove(index, 'up')}
                          className="text-text-tertiary hover:text-text-primary disabled:opacity-30 rounded hover:bg-surface-elevated p-0.5 cursor-pointer"
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          disabled={isLast}
                          onClick={() => handleMove(index, 'down')}
                          className="text-text-tertiary hover:text-text-primary disabled:opacity-30 rounded hover:bg-surface-elevated p-0.5 cursor-pointer"
                        >
                          <ArrowDown size={11} />
                        </button>
                      </div>
                    </TD>
                    <td className="py-3 px-4 text-right flex justify-end gap-1.5 items-center">
                      <button
                        onClick={() => handleEdit(srv)}
                        className="p-1.5 text-text-secondary hover:text-accent hover:bg-surface-elevated rounded cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(srv._id)}
                        className="p-1.5 text-text-secondary hover:text-error hover:bg-surface-elevated rounded cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </TR>
                );
              })}
            </TBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 select-none">
              <span className="text-xs text-text-secondary">
                Showing {services.length} of {pagination.total} records
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Service config Dialog */}
      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Configure Service' : 'Add Service'}</DialogTitle>
          </DialogHeader>

          {saveError && (
            <div className="p-3 mb-4 border border-error/20 bg-error/5 text-error rounded-md text-xs font-semibold text-left select-none">
              {saveError}
            </div>
          )}

          {/* Configuration Tabs */}
          <div className="flex border-b border-border text-xs pt-2 select-none">
            {['general', 'pricing', 'mode', 'docs', 'faqs', 'payment'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFormTab(tab as any)}
                className={`px-4 py-2 border-b-2 font-medium capitalize transition-all cursor-pointer ${
                  formTab === tab
                    ? 'border-accent text-accent font-bold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-left">
            {formTab === 'general' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Service Name</label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">URL Slug</label>
                    <Input value={slug} onChange={(e) => setSlug(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Category</label>
                    <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Service Icon (Emoji/Code)</label>
                    <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. ⚡" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary select-none">Short Description</label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>
            )}

            {formTab === 'pricing' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Govt Fee (₹)</label>
                    <Input type="number" value={govtFee} onChange={(e) => setGovtFee(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">CSC Fee (₹)</label>
                    <Input type="number" value={cscFee} onChange={(e) => setCscFee(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Service Fee (₹)</label>
                    <Input type="number" value={serviceFee} onChange={(e) => setServiceFee(Number(e.target.value))} />
                  </div>
                </div>

                <Card className="p-4 bg-surface-elevated/40 border-border select-none text-left">
                  <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Computed Total Application Fee</span>
                  <div className="text-2xl font-extrabold text-accent mt-1 font-mono">₹{govtFee + cscFee + serviceFee}</div>
                </Card>
              </div>
            )}

            {formTab === 'mode' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Service Mode</label>
                    <Select value={serviceMode} onChange={(e) => setServiceMode(e.target.value as ServiceMode)}>
                      <option value="form">Online Form</option>
                      <option value="queue">Queue token counter</option>
                      <option value="appointment">Appointment booking</option>
                      <option value="walk_in">Walk-in only</option>
                      <option value="hybrid">Hybrid</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Est Processing Duration</label>
                    <Input type="number" value={estimatedTimeValue} onChange={(e) => setEstimatedTimeValue(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Duration Unit</label>
                    <Select value={estimatedTimeUnit} onChange={(e) => setEstimatedTimeUnit(e.target.value as any)}>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5 select-none">
                  <label className="text-xs font-bold text-text-secondary block">Working Days</label>
                  <div className="flex flex-wrap gap-3 pt-2">
                    {daysOfWeek.map((day) => (
                      <label key={day.key} className="flex items-center gap-1.5 text-xs text-text-primary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={workingDays.includes(day.key)}
                          onChange={() => handleDayToggle(day.key)}
                          className="accent-accent h-4 w-4 bg-surface border-border rounded"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formTab === 'docs' && (
              <div className="space-y-3 select-none">
                <label className="text-xs font-bold text-text-secondary block">Check Required Verification Documents</label>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {documentTypes.map((docType) => (
                    <label key={docType} className="flex items-center gap-2 text-xs text-text-primary cursor-pointer capitalize">
                      <input
                        type="checkbox"
                        checked={requiredDocuments.includes(docType)}
                        onChange={() => handleDocTypeToggle(docType)}
                        className="accent-accent h-4 w-4 bg-surface border-border rounded"
                      />
                      {docType.replace('_', ' ')}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formTab === 'faqs' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <label className="text-xs font-bold text-text-secondary select-none">Service FAQs</label>
                  <Button type="button" size="sm" variant="secondary" onClick={addFaqRow}>Add FAQ Row</Button>
                </div>

                {faqs.length === 0 ? (
                  <p className="text-xs text-text-tertiary select-none">No FAQs configured yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {faqs.map((faq, idx) => (
                      <div key={idx} className="p-3 border border-border rounded-md bg-surface-elevated/20 space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => removeFaqRow(idx)}
                          className="absolute top-2 right-2 text-text-tertiary hover:text-error text-xs cursor-pointer font-bold"
                        >
                          ✕
                        </button>
                        <Input
                          placeholder="Question..."
                          value={faq.question}
                          onChange={(e) => updateFaqRow(idx, 'question', e.target.value)}
                          className="h-8 text-xs font-bold pr-6"
                        />
                        <Textarea
                          placeholder="Answer details..."
                          value={faq.answer}
                          onChange={(e) => updateFaqRow(idx, 'answer', e.target.value)}
                          className="text-xs p-2"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {formTab === 'payment' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="pt-3">
                    <Checkbox
                      id="advancePayment"
                      label="Require Advance Deposit"
                      checked={advancePayment}
                      onChange={(e) => {
                        setAdvancePayment(e.target.checked);
                        if (!e.target.checked) setAdvanceAmount(0);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-secondary select-none">Advance Amount (₹)</label>
                    <Input
                      type="number"
                      value={advanceAmount}
                      disabled={!advancePayment}
                      onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-2 select-none">
                  <Checkbox
                    id="allowPartialPayment"
                    label="Allow Installments/Partial Payments"
                    checked={allowPartialPayment}
                    onChange={(e) => setAllowPartialPayment(e.target.checked)}
                  />
                  <Checkbox
                    id="allowFullPayment"
                    label="Allow Full upfront payments"
                    checked={allowFullPayment}
                    onChange={(e) => setAllowFullPayment(e.target.checked)}
                  />
                  <Checkbox
                    id="paymentBeforeProcessing"
                    label="Enforce upfront payment before processing"
                    checked={paymentBeforeProcessing}
                    onChange={(e) => setPaymentBeforeProcessing(e.target.checked)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save Config'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
