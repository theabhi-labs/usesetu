import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe,
  ExternalLink,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Lock,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Star,
  CreditCard,
  Activity,
  HardDrive,
  Sliders,
  Laptop,
} from 'lucide-react';
import { getTenantPublicUrl, getTenantAdminUrl } from '../../lib/tenant';
import { platformApi } from '../../services/platform.api';
import type {
  ApplicationDetailData,
  DomainConfigResponse,
  DomainItem,
  PlanItem,
  ApplicationUsageResponse,
  ApplicationSettingsData,
} from '../../services/platform.api';
import { UsageGauge, formatBytes } from '../../components/platform/UsageGauge';
import { PlanComparison } from '../../components/platform/PlanComparison';
import { PlanChangeModal } from '../../components/platform/PlanChangeModal';
import { CancelSubscriptionModal } from '../../components/platform/CancelSubscriptionModal';
import { ApplicationDangerZone } from '../../components/platform/ApplicationDangerZone';
import { PaymentCheckoutModal } from '../../components/platform/PaymentCheckoutModal';
import { BillingHistoryTable } from '../../components/platform/BillingHistoryTable';
import { GracePeriodBanner } from '../../components/platform/GracePeriodBanner';
import { BillingAuditTable } from '../../components/platform/BillingAuditTable';

export const ApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const tabParam = searchParams.get('tab');
  const validTabs = ['overview', 'usage', 'billing', 'domains', 'settings'] as const;
  type TabType = (typeof validTabs)[number];

  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam && validTabs.includes(tabParam as TabType) ? (tabParam as TabType) : 'overview',
  );

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam as TabType)) {
      setActiveTab(tabParam as TabType);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Custom domain form state
  const [showAddDomainModal, setShowAddDomainModal] = useState<boolean>(false);
  const [newHostname, setNewHostname] = useState<string>('');
  const [verificationMethod, setVerificationMethod] = useState<'cname' | 'txt'>('cname');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [domainActionError, setDomainActionError] = useState<string | null>(null);

  // Billing modal states
  const [selectedPlanForChange, setSelectedPlanForChange] = useState<PlanItem | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState<PlanItem | null>(null);
  const [checkoutCycle, setCheckoutCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<{
    name: string;
    description: string;
    cscName: string;
    tagline: string;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
  }>({
    name: '',
    description: '',
    cscName: '',
    tagline: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#FF6700',
    secondaryColor: '#0D0D0D',
    accentColor: '#FFB800',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
  });

  const [settingsSavedMessage, setSettingsSavedMessage] = useState<string | null>(null);

  // 1. Fetch Application Detail
  const {
    data: application,
    isLoading: appLoading,
    isError: appError,
    error: appFetchError,
  } = useQuery<ApplicationDetailData>({
    queryKey: ['platform-application', id],
    queryFn: () => platformApi.getApplication(id!),
    enabled: !!id,
  });

  // 2. Fetch Usage
  const { data: usageData } = useQuery<ApplicationUsageResponse>({
    queryKey: ['platform-application-usage', id],
    queryFn: () => platformApi.getApplicationUsage(id!),
    enabled: !!id,
  });

  // 3. Fetch Domain Configuration
  const { data: domainConfig } = useQuery<DomainConfigResponse>({
    queryKey: ['platform-application-domain', id],
    queryFn: () => platformApi.getApplicationDomain(id!),
    enabled: !!id,
  });

  // 4. Fetch Plans for comparison
  const { data: plansData } = useQuery<PlanItem[]>({
    queryKey: ['platform-plans'],
    queryFn: platformApi.getPlans,
  });

  // 5. Fetch Settings
  const { data: settingsData } = useQuery<ApplicationSettingsData>({
    queryKey: ['platform-application-settings', id],
    queryFn: () => platformApi.getApplicationSettings(id!),
    enabled: !!id,
  });

  // Sync settings form when settingsData loads
  useEffect(() => {
    if (settingsData) {
      setSettingsForm({
        name: settingsData.application.name || '',
        description: settingsData.branding.description || '',
        cscName: settingsData.branding.cscName || '',
        tagline: settingsData.branding.tagline || '',
        logoUrl: settingsData.branding.logoUrl || '',
        faviconUrl: settingsData.branding.faviconUrl || '',
        primaryColor: settingsData.branding.theme?.primaryColor || '#FF6700',
        secondaryColor: settingsData.branding.theme?.secondaryColor || '#0D0D0D',
        accentColor: settingsData.branding.theme?.accentColor || '#FFB800',
        contactEmail: settingsData.branding.contact?.email || '',
        contactPhone: settingsData.branding.contact?.phone || '',
        contactAddress: settingsData.branding.contact?.address || '',
      });
    }
  }, [settingsData]);

  // Mutations
  const addDomainMutation = useMutation({
    mutationFn: (payload: { hostname: string; verificationMethod: string }) =>
      platformApi.addCustomDomain(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-application-domain', id] });
      setShowAddDomainModal(false);
      setNewHostname('');
      setDomainActionError(null);
    },
    onError: (err: any) => {
      setDomainActionError(err.response?.data?.message || err.message || 'Failed to add custom domain');
    },
  });

  const verifyDomainMutation = useMutation({
    mutationFn: (domainId: string) => platformApi.verifyDomain(id!, domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-application-domain', id] });
      setDomainActionError(null);
    },
    onError: (err: any) => {
      setDomainActionError(err.response?.data?.message || err.message || 'DNS verification failed');
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (domainId: string) => platformApi.setPrimaryDomain(id!, domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-application-domain', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-application', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-applications'] });
    },
    onError: (err: any) => {
      setDomainActionError(err.response?.data?.message || err.message || 'Failed to set primary domain');
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: (domainId: string) => platformApi.deleteDomain(id!, domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-application-domain', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-application', id] });
    },
    onError: (err: any) => {
      setDomainActionError(err.response?.data?.message || err.message || 'Failed to remove domain');
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: (payload: { planId: string; billingCycle: 'monthly' | 'yearly'; reason: string }) =>
      platformApi.changeApplicationPlan(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-application', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-application-usage', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-application-domain', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-applications'] });
      setSelectedPlanForChange(null);
    },
  });

  const cancelSubMutation = useMutation({
    mutationFn: (reason: string) => platformApi.cancelApplicationSubscription(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-application', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-applications'] });
      setShowCancelModal(false);
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (payload: any) => platformApi.updateApplicationSettings(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-application', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-application-settings', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-applications'] });
      setSettingsSavedMessage('Settings updated successfully!');
      setTimeout(() => setSettingsSavedMessage(null), 3000);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (reason?: string) => platformApi.suspendApplication(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-application', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-applications'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (reason?: string) => platformApi.resumeApplication(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-application', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-applications'] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (reason?: string) => platformApi.archiveApplication(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-application', id] });
      queryClient.invalidateQueries({ queryKey: ['platform-applications'] });
    },
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      name: settingsForm.name,
      cscName: settingsForm.cscName,
      tagline: settingsForm.tagline,
      description: settingsForm.description,
      logoUrl: settingsForm.logoUrl,
      faviconUrl: settingsForm.faviconUrl,
      theme: {
        primaryColor: settingsForm.primaryColor,
        secondaryColor: settingsForm.secondaryColor,
        accentColor: settingsForm.accentColor,
        borderRadius: '8px',
        fontFamily: 'Inter, sans-serif',
      },
      contact: {
        email: settingsForm.contactEmail,
        phone: settingsForm.contactPhone,
        address: settingsForm.contactAddress,
      },
    });
  };

  const reconcileMutation = useMutation({
    mutationFn: () => platformApi.reconcileBilling(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['billing-history', id] });
      queryClient.invalidateQueries({ queryKey: ['billing-audits', id] });
    },
  });

  if (appLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-28 bg-slate-900/80 border border-slate-800 rounded-3xl" />
        <div className="h-96 bg-slate-900/60 border border-slate-800 rounded-3xl" />
      </div>
    );
  }

  if (appError || !application) {
    return (
      <div className="bg-rose-950/20 border border-rose-800/40 rounded-3xl p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-rose-200">Application not found or access denied</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {(appFetchError as any)?.response?.data?.message || 'You may not have authorization to view this application.'}
        </p>
        <Link
          to="/platform/applications"
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applications</span>
        </Link>
      </div>
    );
  }

  const primaryDomain = domainConfig?.primaryDomain || application.defaultDomain;
  const currentPlanSlug = application.subscription?.planSlug || 'free';

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-xs text-text-tertiary">
          <Link to="/platform/applications" className="hover:text-text-primary transition-colors flex items-center space-x-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Applications</span>
          </Link>
          <span>/</span>
          <span className="text-text-primary font-semibold truncate max-w-xs">{application.name}</span>
        </div>

        <div className="bg-surface border border-border p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-surface-elevated text-text-secondary border border-border">
                {application.template?.name || 'Digital Service Center'}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${
                  application.status === 'active'
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-warning/10 text-warning border-warning/20'
                }`}
              >
                {application.status}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {application.name}
            </h1>

            <div className="flex items-center space-x-4 text-xs text-text-tertiary mt-2">
              <span className="flex items-center space-x-1">
                <Globe className="w-3.5 h-3.5 text-accent" />
                <span className="font-semibold text-text-secondary">{primaryDomain}</span>
              </span>
              <span>•</span>
              <span>Plan: <strong className="text-accent uppercase">{application.subscription?.plan || 'Free'}</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={getTenantAdminUrl(application.slug, primaryDomain)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-surface-elevated hover:bg-surface text-text-primary text-xs font-bold px-4 py-3 rounded-2xl border border-border transition-all shrink-0"
              title="Open Tenant Admin Desk"
            >
              <Laptop className="w-4 h-4 text-accent" />
              <span>Admin Panel</span>
            </a>

            <a
              href={getTenantPublicUrl(application.slug, primaryDomain)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg shadow-accent/20 transition-all shrink-0"
            >
              <span>Open Live Center</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Grace Period Warning Banner (if past_due) */}
      <GracePeriodBanner
        subscription={application.subscription}
        onRetryClick={() => handleTabChange('billing')}
      />

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-1 border-b border-border overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'usage', label: 'Usage & Quotas', icon: HardDrive },
          { id: 'billing', label: 'Billing & Plans', icon: CreditCard },
          { id: 'domains', label: 'Domain Management', icon: Globe },
          { id: 'settings', label: 'Settings & Lifecycle', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabType)}
              className={`flex items-center space-x-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'border-accent text-accent bg-surface-elevated rounded-t-xl'
                  : 'border-transparent text-text-tertiary hover:text-text-primary hover:border-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Health & Status Card */}
          <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-tertiary">Center Status</span>
              <h3 className="text-lg font-bold text-text-primary flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>Operating Normally ({application.status.toUpperCase()})</span>
              </h3>
              <p className="text-xs text-text-secondary">
                All microservices, request intake workflows, and customer verification tokens are operational.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Link
                to={`/platform/applications/${id}?tab=usage`}
                className="px-4 py-2 bg-surface-elevated hover:bg-surface text-text-primary text-xs font-bold rounded-xl border border-border transition-colors cursor-pointer"
              >
                Inspect Quotas
              </Link>
            </div>
          </div>

          {/* Quick Metrics Snapshot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-surface-elevated border border-border rounded-2xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block mb-1">
                Active Staff
              </span>
              <span className="text-xl font-black text-text-primary">
                {usageData?.metrics?.activeUsers?.used || 0} / {usageData?.metrics?.activeUsers?.limit || 5}
              </span>
            </div>

            <div className="bg-surface-elevated border border-border rounded-2xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block mb-1">
                Storage Used
              </span>
              <span className="text-xl font-black text-text-primary">
                {formatBytes(usageData?.metrics?.storage?.used || 0)}
              </span>
            </div>

            <div className="bg-surface-elevated border border-border rounded-2xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block mb-1">
                Monthly Requests
              </span>
              <span className="text-xl font-black text-text-primary">
                {usageData?.metrics?.requests?.used || 0} / {usageData?.metrics?.requests?.limit?.toLocaleString() || '200'}
              </span>
            </div>

            <div className="bg-surface-elevated border border-border rounded-2xl p-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block mb-1">
                Monthly Appointments
              </span>
              <span className="text-xl font-black text-text-primary">
                {usageData?.metrics?.appointments?.used || 0} / {usageData?.metrics?.appointments?.limit?.toLocaleString() || '50'}
              </span>
            </div>
          </div>

          {/* Center Details Grid */}
          <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
              Center Blueprint & Infrastructure
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1">
                <span className="text-text-tertiary font-semibold">Primary Public Hostname</span>
                <span className="font-bold text-text-primary block text-sm">{primaryDomain}</span>
              </div>

              <div className="space-y-1">
                <span className="text-text-tertiary font-semibold">Default Platform URL</span>
                <span className="font-bold text-text-secondary block text-sm">{application.defaultDomain}</span>
              </div>

              <div className="space-y-1">
                <span className="text-text-tertiary font-semibold">Template Blueprint</span>
                <span className="font-bold text-text-primary block">{application.template?.name || 'Digital Service Center'}</span>
              </div>

              <div className="space-y-1">
                <span className="text-text-tertiary font-semibold">Created Date</span>
                <span className="font-bold text-text-primary block">
                  {new Date(application.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USAGE & QUOTAS */}
      {activeTab === 'usage' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Resource Consumption & Quotas</h2>
              <p className="text-xs text-slate-400">
                Live consumption metrics dynamically synced from your active subscription entitlements.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UsageGauge
              label="Active Staff Operators"
              used={usageData?.metrics?.activeUsers?.used || 0}
              limit={usageData?.metrics?.activeUsers?.limit}
              unit="seats"
            />

            <UsageGauge
              label="Cloud Storage"
              used={usageData?.metrics?.storage?.used || 0}
              limit={usageData?.metrics?.storage?.limit}
              isStorage={true}
            />

            <UsageGauge
              label="Monthly Service Requests"
              used={usageData?.metrics?.requests?.used || 0}
              limit={usageData?.metrics?.requests?.limit}
              unit="requests"
            />

            <UsageGauge
              label="Monthly Desk Appointments"
              used={usageData?.metrics?.appointments?.used || 0}
              limit={usageData?.metrics?.appointments?.limit}
              unit="appointments"
            />

            <UsageGauge
              label="Monthly Outbound Messages (Email & WhatsApp)"
              used={usageData?.metrics?.monthlyMessages?.used || 0}
              limit={usageData?.metrics?.monthlyMessages?.limit}
              unit="messages"
            />
          </div>

          {/* Plan Feature Entitlements Checklist */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Plan Features Matrix
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {[
                { name: 'Custom Domain SSL', enabled: usageData?.features?.customDomain },
                { name: 'WhatsApp Notifications', enabled: usageData?.features?.whatsapp },
                { name: 'Email Delivery Engine', enabled: usageData?.features?.email },
                { name: 'Export Financial Reports', enabled: usageData?.features?.exportReports },
                { name: 'Custom Center Branding', enabled: usageData?.features?.customBranding },
              ].map((feat) => (
                <div
                  key={feat.name}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-300">{feat.name}</span>
                  {feat.enabled ? (
                    <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Enabled
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                      Disabled
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BILLING & PLANS */}
      {activeTab === 'billing' && (
        <div className="space-y-8">
          {/* Current Subscription Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">
                Active Plan
              </span>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                {application.subscription?.plan || 'Free'} Plan
              </h2>
              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span>
                  Status:{' '}
                  <strong className="text-emerald-400 uppercase font-bold">
                    {application.subscription?.status || 'Active'}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Cycle:{' '}
                  <strong className="text-slate-200 capitalize">
                    {application.subscription?.billingCycle || 'Monthly'}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => reconcileMutation.mutate()}
                disabled={reconcileMutation.isPending}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
                title="Verify and repair any billing state discrepancy with payment provider"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reconcileMutation.isPending ? 'animate-spin text-orange-400' : ''}`} />
                <span>{reconcileMutation.isPending ? 'Syncing...' : 'Sync & Verify Status'}</span>
              </button>

              {currentPlanSlug !== 'free' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel Plan
                </button>
              )}
            </div>
          </div>

          {/* Plan Comparison Matrix */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-white">Upgrade or Switch Plan</h3>
              <p className="text-xs text-slate-400">
                Select a plan that matches your business volume. Limits and entitlements update immediately upon checkout.
              </p>
            </div>

            <PlanComparison
              plans={plansData || []}
              currentPlanSlug={currentPlanSlug}
              onSelectPlan={(plan, cycle) => {
                setCheckoutPlan(plan);
                setCheckoutCycle(cycle);
              }}
              isLoading={changePlanMutation.isPending}
            />
          </div>

          {/* Billing Transactions / History */}
          <BillingHistoryTable applicationId={id!} />

          {/* Immutable Billing Audit Trail */}
          <BillingAuditTable applicationId={id!} />
        </div>
      )}

      {/* TAB 4: DOMAINS */}
      {activeTab === 'domains' && (
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Domain Management</h2>
              <p className="text-xs text-slate-400">
                Connect custom apex and subdomains with automatic DNS verification and SSL provisioning.
              </p>
            </div>

            <button
              onClick={() => setShowAddDomainModal(true)}
              disabled={!domainConfig?.customDomainsEnabled}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Custom Domain</span>
            </button>
          </div>

          {domainActionError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{domainActionError}</span>
            </div>
          )}

          {/* Entitlement Pill */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Custom Domains Used:{' '}
              <strong className="text-white">
                {domainConfig?.entitlement?.used || 0} / {domainConfig?.entitlement?.limit || 0}
              </strong>
            </span>
            {!domainConfig?.customDomainsEnabled && (
              <span className="text-amber-400 font-semibold flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Upgrade plan to connect custom domains</span>
              </span>
            )}
          </div>

          {/* Domains List */}
          <div className="space-y-4">
            {domainConfig?.domains?.map((domain: DomainItem) => (
              <div
                key={domain.id}
                className={`bg-slate-900/80 border rounded-3xl p-6 transition-all ${
                  domain.isPrimary ? 'border-orange-500/60 shadow-lg shadow-orange-500/5' : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-bold text-white">{domain.hostname}</span>
                      {domain.isPrimary && (
                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20 flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-orange-400" />
                          <span>Primary</span>
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          domain.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {domain.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <span>Type: <strong className="text-slate-300 uppercase">{domain.type}</strong></span>
                      <span>•</span>
                      <span>SSL: <strong className="text-emerald-400 uppercase">{domain.sslStatus}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {domain.type === 'custom' && domain.status !== 'active' && (
                      <button
                        onClick={() => verifyDomainMutation.mutate(domain.id)}
                        disabled={verifyDomainMutation.isPending}
                        className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${verifyDomainMutation.isPending ? 'animate-spin' : ''}`} />
                        <span>Verify DNS</span>
                      </button>
                    )}

                    {domain.status === 'active' && !domain.isPrimary && (
                      <button
                        onClick={() => setPrimaryMutation.mutate(domain.id)}
                        disabled={setPrimaryMutation.isPending}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
                      >
                        Make Primary
                      </button>
                    )}

                    {domain.type === 'custom' && (
                      <button
                        onClick={() => deleteDomainMutation.mutate(domain.id)}
                        disabled={deleteDomainMutation.isPending}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                        title="Disconnect domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* DNS Instructions if pending */}
                {domain.instructions && domain.status !== 'active' && (
                  <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3 text-xs">
                    <span className="font-bold text-slate-300 block">DNS Configuration Required:</span>
                    <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800/80 font-mono text-[11px] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Record Type:</span>
                        <span className="text-orange-400 font-bold">{domain.instructions.primaryMethod.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Host / Name:</span>
                        <span className="text-white font-bold">{domain.instructions.cname.host}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Value / Target:</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-300">{domain.instructions.cname.target}</span>
                          <button
                            onClick={() => handleCopy(domain.instructions!.cname.target, `target-${domain.id}`)}
                            className="text-slate-400 hover:text-white"
                          >
                            {copiedKey === `target-${domain.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Custom Domain Modal */}
          {showAddDomainModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-base font-bold text-white">Connect Custom Domain</h3>
                  <button onClick={() => setShowAddDomainModal(false)} className="text-slate-400 hover:text-white">
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300">Domain Hostname</label>
                  <input
                    type="text"
                    value={newHostname}
                    onChange={(e) => setNewHostname(e.target.value)}
                    placeholder="e.g. portal.mycenter.in"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
                  />
                  <div className="flex items-center space-x-4 pt-1">
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={verificationMethod === 'cname'}
                        onChange={() => setVerificationMethod('cname')}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <span>CNAME Record</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        checked={verificationMethod === 'txt'}
                        onChange={() => setVerificationMethod('txt')}
                        className="text-orange-500 focus:ring-orange-500"
                      />
                      <span>TXT Record</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Enter the apex domain or subdomain you wish to point to this UseSetu digital center.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddDomainModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => addDomainMutation.mutate({ hostname: newHostname, verificationMethod })}
                    disabled={!newHostname || addDomainMutation.isPending}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20"
                  >
                    {addDomainMutation.isPending ? 'Connecting...' : 'Add Domain'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SETTINGS & LIFECYCLE */}
      {activeTab === 'settings' && (
        <div className="space-y-8">
          {/* General & Branding Settings Form */}
          <form onSubmit={handleSaveSettings} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">General & Branding Configuration</h3>
                <p className="text-xs text-slate-400">
                  Customize center name, theme colors, logos, and contact information.
                </p>
              </div>

              {settingsSavedMessage && (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full animate-fade-in">
                  {settingsSavedMessage}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Platform Application Name</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Public Business / Center Name</label>
                <input
                  type="text"
                  value={settingsForm.cscName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, cscName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="font-semibold text-slate-300">Center Description / Tagline</label>
                <input
                  type="text"
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Logo Image URL</label>
                <input
                  type="text"
                  value={settingsForm.logoUrl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Favicon URL</label>
                <input
                  type="text"
                  value={settingsForm.faviconUrl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, faviconUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Theme Colors */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Primary Theme Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={settingsForm.primaryColor}
                    onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={settingsForm.primaryColor}
                    onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white uppercase focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">Contact Support Email</label>
                <input
                  type="email"
                  value={settingsForm.contactEmail}
                  onChange={(e) => setSettingsForm({ ...settingsForm, contactEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={updateSettingsMutation.isPending}
                className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
              >
                {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

          {/* Danger Zone & Lifecycle Transitions */}
          <ApplicationDangerZone
            status={application.status}
            appName={application.name}
            onSuspend={async (reason) => {
              await suspendMutation.mutateAsync(reason);
            }}
            onResume={async (reason) => {
              await resumeMutation.mutateAsync(reason);
            }}
            onArchive={async (reason) => {
              await archiveMutation.mutateAsync(reason);
            }}
            isLoading={suspendMutation.isPending || resumeMutation.isPending || archiveMutation.isPending}
          />
        </div>
      )}

      {/* Plan Change Modal */}
      <PlanChangeModal
        isOpen={!!selectedPlanForChange}
        onClose={() => setSelectedPlanForChange(null)}
        targetPlan={selectedPlanForChange}
        currentPlanName={application.subscription?.plan || 'Free'}
        billingCycle={selectedBillingCycle}
        usageData={usageData}
        onConfirm={async (planId, cycle, reason) => {
          await changePlanMutation.mutateAsync({ planId, billingCycle: cycle, reason });
        }}
        isLoading={changePlanMutation.isPending}
      />

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        currentPlanName={application.subscription?.plan || 'Free'}
        onConfirm={async (reason) => {
          await cancelSubMutation.mutateAsync(reason);
        }}
        isLoading={cancelSubMutation.isPending}
      />

      {/* Razorpay Payment Checkout Modal (Stage 7) */}
      {checkoutPlan && (
        <PaymentCheckoutModal
          isOpen={!!checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          applicationId={id!}
          applicationName={application.name}
          plan={checkoutPlan}
          initialCycle={checkoutCycle}
          onPaymentSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['platform-application', id] });
            queryClient.invalidateQueries({ queryKey: ['platform-applications'] });
            queryClient.invalidateQueries({ queryKey: ['billing-history', id] });
          }}
        />
      )}
    </div>
  );
};
