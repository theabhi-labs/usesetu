import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { serviceApi } from '../../services/service.api';
import { formApi } from '../../services/form.api';
import { appointmentApi } from '../../services/appointment.api';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { FormRenderer } from '../../components/common/FormRenderer';
import {
  ArrowLeft,
  Clock,
  FileText,
  HelpCircle,
  Calendar,
  Copy,
  CheckCircle2,
} from 'lucide-react';

export function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'info' | 'apply' | 'book'>('info');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'apply' && isAuthenticated) {
      setActiveTab('apply');
    } else if (tabParam === 'book' && isAuthenticated) {
      setActiveTab('book');
    }
  }, [isAuthenticated]);

  // Queries
  const serviceQuery = useQuery({
    queryKey: ['publicServiceDetail', slug],
    queryFn: () => serviceApi.getPublicBySlug(slug || ''),
    enabled: !!slug,
  });

  const service = serviceQuery.data;

  const formSchemaQuery = useQuery({
    queryKey: ['publicFormSchema', slug],
    queryFn: () => formApi.getPublicBySlug(slug || ''),
    enabled: activeTab === 'apply' && !!slug,
  });

  const slotsQuery = useQuery({
    queryKey: ['appointmentSlots', service?.id, selectedDate],
    queryFn: () => appointmentApi.getAvailableSlots(service?.id || '', selectedDate),
    enabled: activeTab === 'book' && !!service?.id && !!selectedDate,
  });

  // Mutations
  const formSubmitMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      formApi.submitPublicForm(slug || '', values),
    onSuccess: (data) => {
      if (data.applicationNumber) {
        setApplicationNumber(data.applicationNumber);
      } else {
        throw new Error('Form submitted successfully, but request tracking registration failed because this service has no workflow configured. Please contact support.');
      }
    },
  });

  const bookingMutation = useMutation({
    mutationFn: (body: any) => appointmentApi.book(body),
    onSuccess: () => {
      navigate('/portal');
    },
  });

  const handleBookSlot = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/services/${slug}`);
      return;
    }
    if (selectedSlot && service?.id && selectedDate) {
      bookingMutation.mutate({
        service: service.id,
        appointmentDate: selectedDate,
        slotStart: selectedSlot.start,
        slotEnd: selectedSlot.end,
        remarks: 'Booked via public service portal',
      });
    }
  };

  const handleCopy = () => {
    if (applicationNumber) {
      navigator.clipboard.writeText(applicationNumber);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (serviceQuery.isLoading) {
    return (
      <div className="container mx-auto p-8 max-w-4xl space-y-6">
        <Skeleton className="h-6 w-32 animate-pulse" />
        <Skeleton className="h-10 w-2/3 animate-pulse" />
        <Skeleton className="h-[240px] w-full animate-pulse" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container mx-auto p-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-text-primary select-none">Service Not Found</h2>
        <p className="text-sm text-text-secondary select-none">The service details you are looking for are unavailable.</p>
        <Link to="/">
          <Button variant="secondary">Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl space-y-8 text-left">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary select-none"
      >
        <ArrowLeft size={14} /> Back to Services
      </Link>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-border pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{service.icon || '⚡'}</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">{service.name}</h1>
          </div>
          {service.description && (
            <p className="text-sm text-text-secondary max-w-2xl select-none">{service.description}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full text-center select-none font-mono">
            {service.serviceMode} Mode
          </div>
        </div>
      </div>

      {/* Submitted Success Panel */}
      {applicationNumber ? (
        <Card className="border-success/20 bg-success/5 p-8 text-center space-y-6 max-w-xl mx-auto">
          <div className="flex justify-center">
            <CheckCircle2 size={48} className="text-success" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-text-primary select-none">Application Submitted Successfully</h3>
            <p className="text-xs text-text-secondary select-none">
              Your application has been received and is currently being processed. Please retain this reference code for tracking updates.
            </p>
          </div>

          <div className="border border-border bg-surface p-4 rounded-md flex items-center justify-between gap-4">
            <code className="text-xl font-mono font-bold text-accent select-all">{applicationNumber}</code>
            <Button size="sm" variant="secondary" onClick={handleCopy}>
              <Copy size={14} className="mr-1.5" /> {copySuccess ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <div className="flex justify-center gap-4">
            <Link to={`/track/${applicationNumber}`}>
              <Button>Track Application</Button>
            </Link>
            <Button variant="outline" onClick={() => setApplicationNumber(null)}>
              Apply Again
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Main Action Tabs */}
          <div className="flex border-b border-border text-sm select-none">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-5 py-3 border-b-2 font-medium transition-all cursor-pointer ${
                activeTab === 'info'
                  ? 'border-accent text-accent font-bold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Requirements
            </button>
            {service.serviceMode !== 'appointment' ? (
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate(`/login?redirect=/services/${slug}?tab=apply`);
                  } else {
                    setActiveTab('apply');
                  }
                }}
                className={`px-5 py-3 border-b-2 font-medium transition-all cursor-pointer ${
                  activeTab === 'apply'
                    ? 'border-accent text-accent font-bold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Apply Online
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate(`/login?redirect=/services/${slug}?tab=book`);
                  } else {
                    setActiveTab('book');
                  }
                }}
                className={`px-5 py-3 border-b-2 font-medium transition-all cursor-pointer ${
                  activeTab === 'book'
                    ? 'border-accent text-accent font-bold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                Book Appointment
              </button>
            )}
          </div>

          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Grid pricing/timing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4 space-y-2">
                  <div className="text-xs text-text-secondary uppercase tracking-wider flex items-center gap-1.5 select-none font-mono">
                    <Clock size={14} /> Estimated processing time
                  </div>
                  <div className="text-lg font-bold text-text-primary select-none">
                    {service.estimatedTime.value} {service.estimatedTime.unit}
                  </div>
                </Card>
                <Card className="p-4 space-y-2">
                  <div className="text-xs text-text-secondary uppercase tracking-wider flex items-center gap-1.5 select-none font-mono">
                    Government / Service Fee
                  </div>
                  <div className="text-lg font-bold text-text-primary font-mono select-none">
                    ₹{service.fees.total}
                    <span className="text-xs text-text-secondary font-normal font-sans ml-2">
                      (Base: ₹{service.fees.govt} + Portal: ₹{service.fees.service})
                    </span>
                  </div>
                </Card>
              </div>

              {/* Required Documents */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider select-none">Required Documents</h3>
                {service.requiredDocuments && service.requiredDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {service.requiredDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-center gap-2 border border-border bg-surface p-3 rounded-md">
                        <FileText size={14} className="text-accent" />
                        <span className="capitalize font-medium text-text-primary select-none">{doc.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary select-none">No specific documents required.</p>
                )}
              </div>

              {/* Instructions */}
              {service.instructions && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider select-none">Instructions</h3>
                  <div className="text-xs text-text-secondary leading-relaxed border border-border bg-surface p-4 rounded-md">
                    {service.instructions}
                  </div>
                </div>
              )}

              {/* FAQs */}
              {service.faqs && service.faqs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-1 select-none">
                    <HelpCircle size={16} className="text-accent" /> Frequently Asked Questions
                  </h3>
                  <div className="space-y-2 text-left">
                    {service.faqs.map((faq, idx) => (
                      <div key={idx} className="border border-border rounded-md bg-surface p-4 text-xs space-y-2">
                        <p className="font-bold text-text-primary">Q: {faq.question}</p>
                        <p className="text-text-secondary leading-relaxed">A: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Apply Tab */}
          {activeTab === 'apply' && (
            <div className="space-y-6">
              {formSchemaQuery.isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full animate-pulse" />
                  <Skeleton className="h-24 w-full animate-pulse" />
                </div>
              ) : formSchemaQuery.data ? (
                <FormRenderer
                  formSchema={formSchemaQuery.data}
                  onSubmit={(values) => formSubmitMutation.mutate(values)}
                  isSubmitting={formSubmitMutation.isPending}
                  submitError={
                    formSubmitMutation.isError
                      ? (formSubmitMutation.error as any)?.response?.data?.message || 'Submission failed'
                      : undefined
                  }
                />
              ) : (
                <div className="text-center p-12 border border-dashed border-border rounded-lg bg-surface">
                  <p className="text-sm text-text-secondary select-none">Online form submission is not available for this service.</p>
                </div>
              )}
            </div>
          )}

          {/* Appointment slots booking Widget */}
          {activeTab === 'book' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Date Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-secondary uppercase select-none">Select Appointment Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setSelectedSlot(null);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-surface border border-border text-text-primary px-3 py-2 rounded-md focus:border-accent focus:ring-1 focus:ring-accent font-sans text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Slots Grid */}
                <div className="md:col-span-2 space-y-3">
                  <label className="text-xs font-bold text-text-secondary uppercase select-none">Available Slots</label>
                  {!selectedDate ? (
                    <div className="p-8 border border-dashed border-border rounded-md text-center text-xs text-text-secondary select-none">
                      Select a date to check scheduling capacity.
                    </div>
                  ) : slotsQuery.isLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full animate-pulse" />
                      ))}
                    </div>
                  ) : slotsQuery.isError ? (
                    <div className="p-4 bg-error/5 border border-error/20 text-error text-xs rounded-md select-none">
                      Failed to fetch active slots.
                    </div>
                  ) : slotsQuery.data?.slots && slotsQuery.data.slots.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {slotsQuery.data.slots.map((slot, index) => {
                        const isAvailable = slot.available > 0;
                        const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                        return (
                          <button
                            key={index}
                            disabled={!isAvailable}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-3 border rounded-md text-xs font-medium text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'border-accent bg-accent/10 text-accent font-bold'
                                : isAvailable
                                ? 'border-border bg-surface hover:border-accent hover:bg-surface-elevated/40 text-text-primary'
                                : 'border-border-strong bg-border-strong/10 text-text-tertiary opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <span className="block font-mono text-xs select-all">{slot.start} - {slot.end}</span>
                            <span className="block text-[9px] mt-1 uppercase text-text-tertiary select-none">
                              {slot.available} left
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-border rounded-md text-center text-xs text-text-secondary select-none">
                      No bookings slots configured for this date.
                    </div>
                  )}
                </div>
              </div>

              {selectedSlot && (
                <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-left space-y-1">
                    <span className="text-[10px] text-text-secondary uppercase block font-medium select-none">Selected Slot</span>
                    <span className="font-semibold text-text-primary text-sm select-all">
                      {new Date(selectedDate).toLocaleDateString(undefined, { dateStyle: 'medium' })} |{' '}
                      <span className="font-mono text-accent">{selectedSlot.start} - {selectedSlot.end}</span>
                    </span>
                  </div>
                  <Button
                    onClick={handleBookSlot}
                    disabled={bookingMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {bookingMutation.isPending ? 'Booking Slot...' : 'Confirm Appointment'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
