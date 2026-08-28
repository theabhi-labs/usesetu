import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { cmsApi } from '../../services/cms.api';
import { categoryApi } from '../../services/category.api';
import { serviceApi } from '../../services/service.api';
import {
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Workflow,
  FileText,
  CreditCard,
  Monitor,
  ShieldCheck,
  Activity,
  Sparkles,
  Clock,
  Search,
  Lock,
  Play,
  RotateCcw,
  CheckCircle2,
  Users,
  Cpu,
  FileCheck,
  Laptop,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export function TenantPublicHome() {
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('tenant') || searchParams.get('app');
  const [activeFaq, setActiveFaq] = useState<string | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [activeCycleStep, setActiveCycleStep] = useState<number>(0);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Interactive Simulator State
  const [simState, setSimState] = useState<{
    isRunning: boolean;
    step: number;
    appNumber: string;
    token: string;
    status: string;
    logs: string[];
  }>({
    isRunning: false,
    step: 0,
    appNumber: 'APP-2026-9042',
    token: 'T-018',
    status: 'Ready',
    logs: ['Simulator idle. Click "Run Journey Simulation" to start the end-to-end lifecycle test.'],
  });

  // Queries
  const settingsQuery = useQuery({
    queryKey: ['cmsSettings'],
    queryFn: cmsApi.getSettings,
  });

  const announcementsQuery = useQuery({
    queryKey: ['publicAnnouncements'],
    queryFn: cmsApi.getPublicAnnouncements,
  });

  const categoriesQuery = useQuery({
    queryKey: ['publicCategories'],
    queryFn: categoryApi.getPublic,
  });

  const featuredServicesQuery = useQuery({
    queryKey: ['featuredServices'],
    queryFn: serviceApi.getFeatured,
  });

  const publicServicesQuery = useQuery({
    queryKey: ['publicServices'],
    queryFn: serviceApi.getPublic,
  });

  const faqsQuery = useQuery({
    queryKey: ['publicFaqs'],
    queryFn: () => cmsApi.getPublicFaqs(),
  });

  const settings = settingsQuery.data;
  const announcements = announcementsQuery.data || [];
  const categories = categoriesQuery.data || [];
  const featuredServices = featuredServicesQuery.data || [];
  const allServices = publicServicesQuery.data || [];
  const faqs = faqsQuery.data || [];

  const pinnedAnnouncement = announcements.find((a) => a.isPinned && a.isActive);

  // Lifecycle Steps Definition
  const lifecycleSteps = [
    {
      id: 0,
      title: '1. Citizen Discovery & Dynamic Form',
      role: 'Citizen / Applicant',
      icon: <FileText className="w-5 h-5 text-accent" />,
      tag: 'No-Code Form Engine',
      summary:
        'Citizen discovers desired service, fills 38+ field dynamic forms with Indian PAN/Aadhaar format validation, conditional gates, and instant document uploads.',
      features: [
        '38+ Dynamic form field types (Aadhaar, PAN, Signature, File Upload)',
        'Reactive conditional logic (Show/Hide/Require sub-questions)',
        'Immutable Form Versioning (Historical submissions stay locked to submitted schema)',
      ],
      route: '#services',
      cta: 'Browse Citizen Services',
    },
    {
      id: 1,
      title: '2. Atomic Request & Queue Token',
      role: 'System / Engine',
      icon: <Clock className="w-5 h-5 text-warning" />,
      tag: 'Race-Safe Atomic Counters',
      summary:
        'MongoDB atomic $inc counter allocates tamper-proof application numbers and assigns priority-weighted queue tokens synced with the Live TV Lobby Display.',
      features: [
        'Zero-collision Application Number generator (APP-2026-XXXX)',
        'Atomic Daily Token generator (A-012, B-044) with priority weightings',
        'Live TV Lobby Display integration with 5s auto-refresh',
      ],
      route: '/queue-display',
      cta: 'View Live TV Display',
    },
    {
      id: 2,
      title: '3. Smart Desk Operations & Verification',
      role: 'Operator / Staff Desk',
      icon: <Users className="w-5 h-5 text-accent" />,
      tag: 'High-Speed Desk Suite',
      summary:
        'Counter operator looks up applicant instantly by 10-digit mobile number, verifies mandatory physical/digital documents, and advances workflow stages.',
      features: [
        '10-Digit mobile exact-match fast index lookup',
        'Checklist-based document verification with approve/reject tags',
        'Atomic Call Next / Recall / Skip controls with operator screen lock',
      ],
      route: '/admin/queue',
      cta: 'Open Operator Desk',
    },
    {
      id: 3,
      title: '4. Autonomous Multi-Stage Workflow',
      role: 'Workflow Engine',
      icon: <Workflow className="w-5 h-5 text-success" />,
      tag: 'Stage Gatekeeper',
      summary:
        'Pure workflowEngine evaluates stage entry criteria (payments completed, docs verified, token called) before transitioning status and firing Brevo alerts.',
      features: [
        'Visual multi-stage pipeline (Submitted → Verified → Processing → Dispatched)',
        'Automated gate checks (Advance payment & mandatory doc requirements)',
        'Event-driven Brevo SMS/Email alerts dispatched on every stage shift',
      ],
      route: '/admin/workflows',
      cta: 'Explore Workflow Engine',
    },
    {
      id: 4,
      title: '5. Append-Only Financial Ledger & QR Receipt',
      role: 'Billing & Payments',
      icon: <CreditCard className="w-5 h-5 text-accent" />,
      tag: 'Double-Refund Protected',
      summary:
        'Append-only payment ledger tracks cash/online transactions, splits Govt vs CSC vs Service fees, and generates printable QR-coded receipts.',
      features: [
        'Single source of truth payment ledger with partial/full support',
        'Dynamic QR Code receipts linking straight to public tracking page',
        'Denormalized paymentSummary kept in strict transactional sync',
      ],
      route: '/admin/payments',
      cta: 'View Payment Register',
    },
    {
      id: 5,
      title: '6. Digital Locker & Citizen Tracking',
      role: 'Citizen Portal & Locker',
      icon: <Lock className="w-5 h-5 text-success" />,
      tag: 'Digital Asset Vault',
      summary:
        'Citizen tracks live progress with zero login required or signs into Customer Portal to store, re-use, and download issued certificates into their encrypted Locker.',
      features: [
        'Public application tracking with timeline & stage comments',
        'Encrypted Digital Document Locker with 1-click re-use in future forms',
        'Printable statements, receipts, and issued completion certificates',
      ],
      route: '/portal/locker',
      cta: 'Open Citizen Locker',
    },
  ];

  // Lifecycle Simulator Logic
  useEffect(() => {
    let timer: any;
    if (simState.isRunning && simState.step < 5) {
      timer = setTimeout(() => {
        const nextStep = simState.step + 1;
        let newLog = '';
        let newStatus = '';

        if (nextStep === 1) {
          newStatus = 'Token Issued';
          newLog = `[Step 2] Atomic Counter assigned Application #APP-2026-9042 and Queue Token #${simState.token}. TV Lobby Screen updated.`;
        } else if (nextStep === 2) {
          newStatus = 'Under Verification';
          newLog = `[Step 3] Operator Desk called #${simState.token}. Aadhaar & Income Certificate verified and approved by Counter 02.`;
        } else if (nextStep === 3) {
          newStatus = 'Workflow Gate Passed';
          newLog = `[Step 4] Pure workflow engine verified stage entry rules. Moved application to "Dept Processing". Brevo SMS dispatched.`;
        } else if (nextStep === 4) {
          newStatus = 'Payment Logged';
          newLog = `[Step 5] Append-only ledger logged ₹120 (Govt: ₹50, CSC: ₹50, Convenience: ₹20). QR Receipt generated.`;
        } else if (nextStep === 5) {
          newStatus = 'Completed & Delivered';
          newLog = `[Step 6] Final digital certificate issued and encrypted into citizen's Digital Locker. Lifecycle cycle completed successfully!`;
        }

        setSimState((prev) => ({
          ...prev,
          step: nextStep,
          status: newStatus,
          isRunning: nextStep < 5,
          logs: [newLog, ...prev.logs],
        }));
      }, 1600);
    }
    return () => clearTimeout(timer);
  }, [simState.isRunning, simState.step, simState.token]);

  const startSimulation = () => {
    const randomApp = `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomToken = `T-0${Math.floor(10 + Math.random() * 80)}`;
    setSimState({
      isRunning: true,
      step: 0,
      appNumber: randomApp,
      token: randomToken,
      status: 'Citizen Submitted Form',
      logs: [
        `[Step 1] Citizen submitted online form for "Income Certificate". Schema validated against draft fork v2.0.`,
      ],
    });
  };

  const resetSimulation = () => {
    setSimState({
      isRunning: false,
      step: 0,
      appNumber: 'APP-2026-9042',
      token: 'T-018',
      status: 'Ready',
      logs: ['Simulator reset. Click "Run Journey Simulation" to start.'],
    });
  };

  // Filtered Services
  const servicesToDisplay = allServices.length > 0 ? allServices : featuredServices;
  const filteredServices = servicesToDisplay.filter((s) => {
    const matchesCategory =
      selectedCategoryFilter === 'all' ||
      (typeof s.category === 'object' && s.category ? (s.category as any)._id === selectedCategoryFilter : s.category === selectedCategoryFilter);
    const matchesSearch =
      searchQuery.trim() === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const websiteTitle = settings?.cscName || settings?.websiteName || 'Common Service Center';

  return (
    <div className="space-y-16 pb-24 text-left">
      {/* Announcement Bar */}
      {showAnnouncement && pinnedAnnouncement && (
        <div className="bg-warning/10 border-b border-warning/20 text-warning px-6 py-2.5 text-sm flex items-center justify-between gap-4 font-sans select-none">
          <div className="flex items-center gap-2 max-w-6xl mx-auto w-full">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-warning text-bg px-1.5 py-0.5 rounded font-mono">
              {pinnedAnnouncement.type}
            </span>
            <span>{pinnedAnnouncement.content}</span>
          </div>
          <button
            onClick={() => setShowAnnouncement(false)}
            className="text-warning/80 hover:text-warning focus:outline-none cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative px-6 max-w-6xl mx-auto pt-4 md:pt-8">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative border border-border bg-surface/80 backdrop-blur-md rounded-2xl p-8 md:p-14 overflow-hidden shadow-2xl space-y-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-accent/10 border border-accent/30 text-accent">
              <Sparkles className="w-3.5 h-3.5 animate-spin" /> Citizen Service Center
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono text-success bg-success/10 border border-success/20">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Counter Services Open
            </span>
          </div>

          <div className="space-y-4 max-w-3xl">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary leading-[1.15]">
              {websiteTitle}
            </h1>
            <p className="text-base md:text-lg text-text-secondary leading-relaxed">
              {settings?.tagline ||
                'Simplifying access to Government, Financial, and Digital services securely. Apply online, generate counter tokens, or track your application status.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a href="#services">
              <Button size="lg" className="gap-2 shadow-lg shadow-accent/20">
                Browse Services & Apply <ArrowRight className="w-4 h-4" />
              </Button>
            </a>
            <Link to={tenantParam ? `/track?tenant=${tenantParam}` : '/track'}>
              <Button variant="outline" size="lg" className="gap-2">
                <Search className="w-4 h-4 text-accent" /> Track Application Status
              </Button>
            </Link>
            <Link to={tenantParam ? `/queue-display?tenant=${tenantParam}` : '/queue-display'}>
              <Button variant="secondary" size="lg" className="gap-2">
                <Monitor className="w-4 h-4 text-success" /> Live TV Queue Screen
              </Button>
            </Link>
            <Link to={tenantParam ? `/portal?tenant=${tenantParam}` : '/portal'}>
              <Button variant="ghost" size="lg" className="gap-2 text-text-secondary hover:text-text-primary">
                <Lock className="w-4 h-4" /> Customer Locker
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Citizen Service Catalog Section (Connected with Database) */}
      <section id="services" className="px-6 max-w-6xl mx-auto space-y-8 scroll-mt-20">
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-accent">Public Service Gateway</div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary mt-1">
              Available Digital Services
            </h2>
            <p className="text-xs text-text-secondary mt-1">
              Apply online, generate queue tokens, or book counter appointment slots directly.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search services (e.g. Pan, Income, Caste)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg bg-surface border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                selectedCategoryFilter === 'all'
                  ? 'bg-accent text-white font-semibold'
                  : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              All Categories ({allServices.length})
            </button>
            {categories
              .filter((c) => c.isActive && !c.parent)
              .map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategoryFilter(cat._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                    selectedCategoryFilter === cat._id
                      ? 'bg-accent text-white font-semibold'
                      : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>{cat.icon || '📁'}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
          </div>
        )}

        {publicServicesQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center p-12 border border-dashed border-border rounded-xl bg-surface space-y-3">
            <p className="text-sm text-text-secondary">No services match your search or filter criteria.</p>
            <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setSelectedCategoryFilter('all'); }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <Card key={service.id} className="flex flex-col justify-between p-5 h-full space-y-4 border border-border hover:border-accent/50 transition-all bg-surface hover:bg-surface-elevated">
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-2xl">{service.icon || '⚡'}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full font-mono">
                      {service.serviceMode}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary text-base line-clamp-1">{service.name}</h3>
                    <p className="text-xs text-text-secondary line-clamp-2 mt-1">{service.description}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                  <div className="font-mono text-text-secondary">
                    Total Fee: <span className="text-text-primary font-bold">₹{service.fees.total}</span>
                  </div>
                  <Link to={tenantParam ? `/services/${service.slug}?tenant=${tenantParam}` : `/services/${service.slug}`}>
                    <Button size="sm" className="gap-1">
                      Apply Now <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* End-to-End Application Cycle Visualizer */}
      <section id="lifecycle" className="px-6 max-w-6xl mx-auto space-y-8 scroll-mt-20">
        <div className="border-b border-border pb-4 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-accent/10 border border-accent/30 text-accent">
            <Workflow className="w-3.5 h-3.5" /> End-to-End Service Cycle
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-primary">
            How Your Application Moves Through Our Service Center
          </h2>
          <p className="text-sm text-text-secondary max-w-3xl">
            From submission to token allocation, document verification, and digital certificate delivery.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-surface p-2 rounded-xl border border-border">
          {lifecycleSteps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => setActiveCycleStep(idx)}
              className={`p-3 rounded-lg text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                activeCycleStep === idx
                  ? 'bg-surface-elevated border border-accent text-text-primary shadow-md'
                  : 'hover:bg-surface-elevated/50 text-text-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold">{idx + 1}</span>
                {step.icon}
              </div>
              <div className="text-xs font-semibold line-clamp-1">{step.title.split('. ')[1]}</div>
            </button>
          ))}
        </div>

        <div className="border border-border bg-surface rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded">
                  {lifecycleSteps[activeCycleStep].tag}
                </span>
                <span className="text-xs text-text-tertiary font-mono">
                  Role: <strong className="text-text-secondary">{lifecycleSteps[activeCycleStep].role}</strong>
                </span>
              </div>
              <h3 className="text-2xl font-bold text-text-primary mt-1">
                {lifecycleSteps[activeCycleStep].title}
              </h3>
            </div>
            {lifecycleSteps[activeCycleStep].route.startsWith('#') ? (
              <a href={lifecycleSteps[activeCycleStep].route}>
                <Button className="gap-2 shrink-0">{lifecycleSteps[activeCycleStep].cta}</Button>
              </a>
            ) : (
              <Link
                to={
                  tenantParam && !lifecycleSteps[activeCycleStep].route.includes('?')
                    ? `${lifecycleSteps[activeCycleStep].route}?tenant=${tenantParam}`
                    : lifecycleSteps[activeCycleStep].route
                }
              >
                <Button className="gap-2 shrink-0">
                  {lifecycleSteps[activeCycleStep].cta} <ExternalLink className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <p className="text-sm text-text-secondary leading-relaxed">
                {lifecycleSteps[activeCycleStep].summary}
              </p>

              <div className="space-y-2 pt-2">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-text-tertiary">
                  Service Process Highlights
                </div>
                <ul className="space-y-2">
                  {lifecycleSteps[activeCycleStep].features.map((feat, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-bg border border-border rounded-xl p-5 space-y-4 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-text-tertiary">Application State Snapshot</span>
                <span className="text-success font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" /> Active Step
                </span>
              </div>
              <div className="p-3 bg-surface rounded border border-border space-y-1.5 text-left">
                <div className="text-text-primary font-bold">{lifecycleSteps[activeCycleStep].title}</div>
                <div className="text-accent text-[11px]">{lifecycleSteps[activeCycleStep].summary}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Simulation Demo */}
      <section className="px-6 max-w-6xl mx-auto space-y-6">
        <div className="border border-border bg-surface-elevated/40 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-accent">
                <Play className="w-3.5 h-3.5" /> Interactive Sandbox Demo
              </div>
              <h3 className="text-xl font-bold text-text-primary mt-1">Live Application Lifecycle Simulator</h3>
              <p className="text-xs text-text-secondary mt-1">
                Run a simulated citizen application through all 6 stages of the service center in real-time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={startSimulation}
                disabled={simState.isRunning}
                className="gap-2"
                size="sm"
              >
                <Play className="w-3.5 h-3.5" /> {simState.isRunning ? 'Simulating...' : 'Run Journey Simulation'}
              </Button>
              <Button
                onClick={resetSimulation}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {lifecycleSteps.map((s, idx) => (
              <div key={idx} className="space-y-1.5">
                <div
                  className={`h-2 rounded-full transition-all ${
                    simState.step >= idx
                      ? 'bg-accent shadow-sm shadow-accent/50'
                      : 'bg-border'
                  }`}
                />
                <div className="text-[10px] font-mono text-text-tertiary line-clamp-1">
                  Step {idx + 1}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-surface border border-border space-y-3">
              <div className="text-xs font-mono text-text-tertiary uppercase">Simulated Request</div>
              <div className="space-y-1">
                <div className="text-xs text-text-secondary">Application No:</div>
                <div className="font-mono font-bold text-text-primary text-sm">{simState.appNumber}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-text-secondary">Assigned Token:</div>
                <div className="font-mono font-bold text-warning text-sm">{simState.token}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-text-secondary">Current Status:</div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-accent/10 border border-accent/20 text-accent">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  {simState.status}
                </div>
              </div>
            </div>

            <div className="md:col-span-2 p-4 rounded-xl bg-bg border border-border space-y-2 font-mono text-xs h-44 overflow-y-auto">
              <div className="flex items-center justify-between text-text-tertiary pb-1 border-b border-border text-[11px]">
                <span>System Event Log</span>
                <span>{simState.logs.length} events logged</span>
              </div>
              <div className="space-y-1.5">
                {simState.logs.map((log, i) => (
                  <div key={i} className="text-text-secondary leading-relaxed flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="px-6 max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary flex items-center justify-center gap-2">
            <HelpCircle className="w-5 h-5 text-accent" /> Frequently Asked Questions
          </h2>
          <p className="text-xs text-text-secondary">Direct answers for citizen applications & service center operations.</p>
        </div>

        {faqsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : faqs.length === 0 ? (
          <div className="space-y-2">
            <div className="border border-border rounded-lg bg-surface p-4 text-left">
              <div className="font-semibold text-sm text-text-primary">Can citizens track applications without logging in?</div>
              <div className="text-xs text-text-secondary mt-2 leading-relaxed">
                Yes! Every submitted application gets a unique Application Number (e.g. APP-2026-XXXX) which can be tracked on the public <code>/track</code> page.
              </div>
            </div>
            <div className="border border-border rounded-lg bg-surface p-4 text-left">
              <div className="font-semibold text-sm text-text-primary">How does the Queue & Token system work?</div>
              <div className="text-xs text-text-secondary mt-2 leading-relaxed">
                Desk operators use <code>/admin/queue</code> to call tokens with priority ordering, while citizens in the lobby view live token updates on the <code>/queue-display</code> screen.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq) => (
              <div key={faq._id} className="border border-border rounded-lg bg-surface overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === faq._id ? null : faq._id)}
                  className="w-full px-5 py-4 flex justify-between items-center text-left hover:bg-surface-elevated transition-colors cursor-pointer focus:outline-none"
                >
                  <span className="font-medium text-sm text-text-primary">{faq.question}</span>
                  {activeFaq === faq._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {activeFaq === faq._id && (
                  <div className="px-5 pb-4 text-xs text-text-secondary leading-relaxed border-t border-border pt-3 bg-bg/25">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
