import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Globe,
  Server,
  Sparkles,
  Shield,
  Clock,
  AlertCircle,
  FileText,
  CreditCard,
  Users,
  FolderLock,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { TemplateData, SlugAvailabilityResponse } from '../../services/platform.api';
import { authApi } from '../../services/auth.api';
import { useAuthStore } from '../../store/authStore';
import { getTenantPublicUrl, getTenantAdminUrl } from '../../lib/tenant';

export const CreateApp: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTemplateSlug = searchParams.get('template');

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [appName, setAppName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false);

  // Slug availability state
  const [slugChecking, setSlugChecking] = useState<boolean>(false);
  const [slugAvailability, setSlugAvailability] = useState<SlugAvailabilityResponse | null>(null);

  // Provisioning steps state
  const [provisioningStatus, setProvisioningStatus] = useState<string>('idle');
  const [provisionedApp, setProvisionedApp] = useState<any>(null);

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery<TemplateData[]>({
    queryKey: ['platform-templates'],
    queryFn: platformApi.getTemplates,
  });

  // Automatically select template from query param or first template if available
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplate) {
      if (preselectedTemplateSlug) {
        const found = templates.find((t) => t.slug === preselectedTemplateSlug);
        if (found) {
          setSelectedTemplate(found);
          setCurrentStep(2);
          return;
        }
      }
      setSelectedTemplate(templates[0]);
    }
  }, [templates, preselectedTemplateSlug, selectedTemplate]);

  // Slug generation from app name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAppName(val);
    if (!isSlugManuallyEdited) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  // Debounced availability check
  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugAvailability(null);
      return;
    }

    const timer = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const result = await platformApi.checkSlugAvailability(slug);
        setSlugAvailability(result);
      } catch (err: any) {
        setSlugAvailability({
          available: false,
          slug,
          reason: err.response?.data?.message || 'Invalid slug format',
        });
      } finally {
        setSlugChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  // Create Application Mutation with Idempotency Key
  const createMutation = useMutation({
    mutationFn: async () => {
      const idempotencyKey = `create-app-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      return await platformApi.createApplication(
        {
          name: appName,
          slug,
          templateSlug: selectedTemplate?.slug || 'digital-service-center',
        },
        idempotencyKey,
      );
    },
    onMutate: () => {
      setProvisioningStatus('creating');
    },
    onSuccess: async (data) => {
      setProvisionedApp(data);
      setProvisioningStatus('ready');
      queryClient.invalidateQueries({ queryKey: ['platform-applications'] });
      try {
        const meRes = await authApi.getMe();
        const currentToken = useAuthStore.getState().accessToken;
        useAuthStore.getState().setSession(meRes.user, currentToken);
      } catch (e) {
        // Safe to ignore
      }
    },
    onError: () => {
      setProvisioningStatus('failed');
    },
  });

  const handleCreateSubmit = () => {
    setCurrentStep(4);
    createMutation.mutate();
  };

  const steps = [
    { num: 1, title: 'Choose App' },
    { num: 2, title: 'Configure' },
    { num: 3, title: 'Review' },
    { num: 4, title: 'Ready' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Wizard Step Progress Header */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                    currentStep === s.num
                      ? 'bg-accent text-white shadow-lg shadow-accent/30 ring-4 ring-accent/20'
                      : currentStep > s.num
                      ? 'bg-success text-white'
                      : 'bg-surface-elevated text-text-tertiary border border-border'
                  }`}
                >
                  {currentStep > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span
                  className={`hidden sm:inline text-xs sm:text-sm font-semibold ${
                    currentStep === s.num
                      ? 'text-text-primary'
                      : currentStep > s.num
                      ? 'text-text-secondary'
                      : 'text-text-tertiary'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-4 transition-colors ${
                    currentStep > s.num ? 'bg-success' : 'bg-border'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* STEP 1: CHOOSE TEMPLATE */}
      {currentStep === 1 && (
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Step 1</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary mt-1">Select an Application Template</h2>
            <p className="text-sm text-text-secondary mt-1">
              Choose the foundational blueprint for your new business application.
            </p>
          </div>

          {templatesLoading ? (
            <div className="h-48 bg-surface-elevated animate-pulse rounded-xl" />
          ) : !templates || templates.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-elevated border border-border text-center space-y-3">
              <Layers className="w-10 h-10 text-accent mx-auto opacity-70" />
              <h3 className="font-bold text-text-primary text-base">No Application Templates Found</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                No active application blueprints were found. Please click below to refresh.
              </p>
              <button
                type="button"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['platform-templates'] })}
                className="px-4 py-2 bg-accent hover:opacity-90 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
              >
                Reload Templates
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {templates?.map((t) => {
                const isSelected = selectedTemplate?.slug === t.slug;
                return (
                  <div
                    key={t._id}
                    onClick={() => setSelectedTemplate(t)}
                    className={`cursor-pointer rounded-2xl p-6 border transition-all duration-200 ${
                      isSelected
                        ? 'bg-surface-elevated border-accent shadow-md shadow-accent/10 ring-2 ring-accent/20'
                        : 'bg-surface border-border hover:border-border-strong hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                          <Layers className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-bold text-text-primary">{t.name}</h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-success/10 text-success border border-success/20">
                              Production Ready
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary mt-1 max-w-xl">{t.description}</p>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 text-xs text-text-secondary">
                            <div className="flex items-center space-x-1.5 bg-surface-elevated px-2.5 py-1.5 rounded-lg border border-border">
                              <Users className="w-3.5 h-3.5 text-accent" />
                              <span>Citizen Portal</span>
                            </div>
                            <div className="flex items-center space-x-1.5 bg-surface-elevated px-2.5 py-1.5 rounded-lg border border-border">
                              <FileText className="w-3.5 h-3.5 text-accent" />
                              <span>Service Requests</span>
                            </div>
                            <div className="flex items-center space-x-1.5 bg-surface-elevated px-2.5 py-1.5 rounded-lg border border-border">
                              <CreditCard className="w-3.5 h-3.5 text-accent" />
                              <span>Billing & Receipts</span>
                            </div>
                            <div className="flex items-center space-x-1.5 bg-surface-elevated px-2.5 py-1.5 rounded-lg border border-border">
                              <FolderLock className="w-3.5 h-3.5 text-accent" />
                              <span>Document Locker</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center sm:self-center">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-accent bg-accent text-white'
                              : 'border-border-strong bg-surface-elevated'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={!selectedTemplate}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-accent/20 transition-all cursor-pointer"
            >
              <span>Next: Basic Information</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CONFIGURE INFO & SLUG */}
      {currentStep === 2 && (
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Step 2</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary mt-1">Configure Application Information</h2>
            <p className="text-sm text-text-secondary mt-1">
              Give your application a business name and pick your exclusive UseSetu default web address.
            </p>
          </div>

          <div className="space-y-6">
            {/* App Name */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Application / Business Name
              </label>
              <input
                type="text"
                value={appName}
                onChange={handleNameChange}
                placeholder="e.g. Abhishek Digital Service Center"
                className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <p className="text-xs text-text-tertiary mt-1.5">
                This is the public-facing title displayed across your customer portal and admin panel.
              </p>
            </div>

            {/* App Slug & Domain Preview */}
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Choose Your Web Address (Slug)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setIsSlugManuallyEdited(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  }}
                  placeholder="e.g. abhishek-digital-center"
                  className={`w-full bg-surface-elevated border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none transition-colors ${
                    slugAvailability?.available === true
                      ? 'border-success focus:border-success'
                      : slugAvailability?.available === false
                      ? 'border-error focus:border-error'
                      : 'border-border focus:border-accent'
                  }`}
                />
                <div className="absolute right-3.5 top-3.5 flex items-center space-x-2">
                  {slugChecking ? (
                    <Clock className="w-4 h-4 text-text-tertiary animate-spin" />
                  ) : slugAvailability?.available === true ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : slugAvailability?.available === false ? (
                    <AlertCircle className="w-4 h-4 text-error" />
                  ) : null}
                </div>
              </div>

              {/* Slug Validation Feedback */}
              <div className="mt-2 text-xs">
                {slugAvailability?.available === true ? (
                  <span className="text-success font-medium flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Domain address is available!</span>
                  </span>
                ) : slugAvailability?.available === false ? (
                  <span className="text-error font-medium flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{slugAvailability.reason || 'This address is unavailable'}</span>
                  </span>
                ) : (
                  <span className="text-text-tertiary">
                    Use lowercase letters, numbers, and hyphens (3-63 characters).
                  </span>
                )}
              </div>

              {/* Live Web Address Preview Card */}
              {slug && (
                <div className="mt-4 p-4 bg-surface-elevated border border-border rounded-xl flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-accent shrink-0" />
                  <div className="text-xs">
                    <span className="text-text-secondary">Default Web Address Preview: </span>
                    <span className="text-accent font-mono font-bold">
                      https://{slug}.usesetu.com
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-border">
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center space-x-2 text-text-secondary hover:text-text-primary text-sm font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => setCurrentStep(3)}
              disabled={!appName.trim() || !slug.trim() || slugAvailability?.available !== true}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 rounded-xl shadow-lg shadow-accent/20 transition-all cursor-pointer"
            >
              <span>Next: Review & Plan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & PLAN LIMITS */}
      {currentStep === 3 && (
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent">Step 3</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary mt-1">Review & Confirm Provisioning</h2>
            <p className="text-sm text-text-secondary mt-1">
              Confirm your application setup and default free subscription entitlements before launch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* App Overview Card */}
            <div className="bg-surface-elevated border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-tertiary flex items-center space-x-2">
                <Server className="w-4 h-4 text-accent" />
                <span>Application Details</span>
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-text-tertiary block">Application Name</span>
                  <span className="font-bold text-text-primary text-base">{appName}</span>
                </div>
                <div>
                  <span className="text-xs text-text-tertiary block">Template Category</span>
                  <span className="text-text-secondary">{selectedTemplate?.name}</span>
                </div>
                <div>
                  <span className="text-xs text-text-tertiary block">Default Domain</span>
                  <span className="font-mono text-accent text-xs">
                    https://{slug}.usesetu.com
                  </span>
                </div>
              </div>
            </div>

            {/* Plan & Entitlements Card */}
            <div className="bg-surface-elevated border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-tertiary flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-success" />
                  <span>Commercial Plan</span>
                </h3>
                <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                  Free Tier (₹0)
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-text-secondary">
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-text-tertiary">Active Operator Seats</span>
                  <span className="font-semibold text-text-primary">5 Users</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-text-tertiary">Cloud Storage Quota</span>
                  <span className="font-semibold text-text-primary">500 MB</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-text-tertiary">Monthly Service Requests</span>
                  <span className="font-semibold text-text-primary">1,000 / month</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border">
                  <span className="text-text-tertiary">Digital Document Locker</span>
                  <span className="text-success font-semibold">Included</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-border">
            <button
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center space-x-2 text-text-secondary hover:text-text-primary text-sm font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleCreateSubmit}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 text-white font-bold text-sm px-8 py-3 rounded-xl shadow-lg shadow-accent/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Provision Application Now</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PROVISIONING & READY */}
      {currentStep === 4 && (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center space-y-8 shadow-xs">
          {provisioningStatus === 'creating' ? (
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent">
                <Clock className="w-8 h-8 animate-spin" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-text-primary">Provisioning Application...</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Setting up isolated workspace, database schema, default domain, and subscription.
                </p>
              </div>

              <div className="bg-surface-elevated border border-border rounded-xl p-5 text-left space-y-3 text-xs">
                <div className="flex items-center space-x-2.5 text-text-primary">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>Tenant workspace created</span>
                </div>
                <div className="flex items-center space-x-2.5 text-text-primary">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>Default domain allocated: {slug}.usesetu.com</span>
                </div>
                <div className="flex items-center space-x-2.5 text-text-primary">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  <span>Default Free subscription active</span>
                </div>
                <div className="flex items-center space-x-2.5 text-text-secondary">
                  <Clock className="w-4 h-4 text-accent animate-spin shrink-0" />
                  <span>Finalizing security boundary...</span>
                </div>
              </div>
            </div>
          ) : provisioningStatus === 'ready' ? (
            <div className="max-w-lg mx-auto space-y-6">
              <div className="w-16 h-16 rounded-full bg-success/20 border border-success/40 flex items-center justify-center mx-auto text-success">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-success">Provisioning Complete</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-1">Your Application is Ready!</h2>
                <p className="text-sm text-text-secondary mt-2">
                  <span className="font-semibold text-text-primary">{appName}</span> has been provisioned and is live on its default domain.
                </p>
              </div>

              <div className="p-4 bg-surface-elevated border border-border rounded-2xl flex items-center justify-between text-left">
                <div className="space-y-0.5 truncate mr-3">
                  <span className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider">
                    {window.location.hostname.includes('localhost') || window.location.hostname === '127.0.0.1'
                      ? 'Local Development Access URL'
                      : 'Web Address'}
                  </span>
                  <div className="font-mono text-sm text-accent truncate">
                    {getTenantPublicUrl(slug, provisionedApp?.domain?.hostname)}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20 shrink-0">
                  Active
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <a
                  href={getTenantAdminUrl(slug, provisionedApp?.domain?.hostname)}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-accent/25 cursor-pointer transition-all"
                >
                  <Laptop className="w-4 h-4" />
                  <span>Go to Tenant Admin Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <a
                  href={getTenantPublicUrl(slug, provisionedApp?.domain?.hostname)}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-surface-elevated hover:bg-surface text-text-primary font-semibold text-sm px-5 py-3 rounded-xl border border-border cursor-pointer"
                >
                  <span>View Citizen Portal</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <Link
                  to="/platform"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-text-tertiary hover:text-text-primary text-xs font-semibold px-4 py-3"
                >
                  <span>Platform Dashboard</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-full bg-error/20 border border-error/40 flex items-center justify-center mx-auto text-error">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary">Application Provisioning Failed</h2>
              <p className="text-sm text-text-secondary">
                {(createMutation.error as any)?.response?.data?.message ||
                  'An unexpected error occurred during provisioning. No orphan records were created.'}
              </p>
              <div className="pt-4 flex justify-center space-x-4">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 bg-surface-elevated hover:bg-surface text-text-primary text-sm font-semibold rounded-xl border border-border cursor-pointer"
                >
                  Back to Review
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
