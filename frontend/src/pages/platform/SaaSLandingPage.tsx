import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { platformApi } from '../../services/platform.api';
import type { TemplateData, PlanItem } from '../../services/platform.api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  Globe,
  Server,
  Shield,
  CreditCard,
  Users,
  Workflow,
  FileCheck,
  FolderLock,
  Zap,
  Laptop,
  Check,
  ExternalLink,
  ChevronRight,
  Building2,
  Lock,
} from 'lucide-react';

export const SaaSLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Fetch real available templates from backend API
  const { data: templates, isLoading: templatesLoading } = useQuery<TemplateData[]>({
    queryKey: ['platform-templates'],
    queryFn: platformApi.getTemplates,
  });

  // Fetch real plans from backend API
  const { data: plans, isLoading: plansLoading } = useQuery<PlanItem[]>({
    queryKey: ['platform-plans'],
    queryFn: platformApi.getPlans,
  });

  // Handle Primary CTA: "Build Your Own Platform"
  const handleBuildPlatform = (templateSlug?: string) => {
    const targetUrl = templateSlug
      ? `/platform/create-app?template=${templateSlug}`
      : '/platform/create-app';

    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(targetUrl)}`);
    } else {
      navigate(targetUrl);
    }
  };

  return (
    <div className="space-y-20 pb-24 text-left">
      {/* Hero Section */}
      <section className="relative px-6 max-w-6xl mx-auto pt-6 md:pt-12">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-accent/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative border border-border bg-surface/80 backdrop-blur-md rounded-3xl p-8 md:p-16 overflow-hidden shadow-2xl space-y-8 text-center md:text-left">
          {/* Header pill */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-semibold bg-accent/10 border border-accent/30 text-accent">
              <Sparkles className="w-3.5 h-3.5 animate-spin" /> UseSetu SaaS Platform v2.0
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono text-success bg-success/10 border border-success/20">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Multi-Tenant Provisioning Active
            </span>
          </div>

          {/* Master Headline */}
          <div className="space-y-4 max-w-4xl mx-auto md:mx-0">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-primary leading-[1.12]">
              Build, Launch & Scale Your Own <span className="text-accent underline decoration-accent/30">Digital Service Platform</span> in Minutes.
            </h1>
            <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-3xl">
              The modern multi-tenant operating system for Common Service Centers (CSCs), Digital Seva Kendras, and Enterprises.
              Equipped with automatic custom domain routing, no-code dynamic forms, atomic workflows, smart queue kiosks, and append-only payment ledgers.
            </p>
          </div>

          {/* Primary Call-to-Actions */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
            <Button
              size="lg"
              onClick={() => handleBuildPlatform()}
              className="gap-2 text-base px-8 py-4 bg-accent hover:bg-accent-hover text-white shadow-xl shadow-accent/25 transform hover:-translate-y-0.5 transition-all font-bold"
            >
              <span>Build Your Own Platform</span>
              <ArrowRight className="w-5 h-5" />
            </Button>

            <a href="#templates">
              <Button variant="outline" size="lg" className="gap-2 text-sm px-6 py-4">
                <Layers className="w-4 h-4 text-accent" />
                <span>Explore Templates</span>
              </Button>
            </a>

            <a href="#pricing">
              <Button variant="ghost" size="lg" className="gap-2 text-sm text-text-secondary hover:text-text-primary">
                <CreditCard className="w-4 h-4" />
                <span>View SaaS Pricing</span>
              </Button>
            </a>
          </div>

          {/* Platform Guarantees Bar */}
          <div className="pt-8 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-text-primary font-mono">1-Click</div>
              <div className="text-xs text-text-secondary">Instant Tenant Provisioning</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-text-primary font-mono">&lt;slug&gt;.usesetu.com</div>
              <div className="text-xs text-text-secondary">Auto Subdomain & SSL Routing</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-text-primary font-mono">38+ Types</div>
              <div className="text-xs text-text-secondary">No-Code Form Builder Engine</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-text-primary font-mono">100% ACID</div>
              <div className="text-xs text-text-secondary">Append-Only Payment Ledger</div>
            </div>
          </div>
        </div>
      </section>

      {/* Template & Category Selection Section (Dynamic from Backend) */}
      <section id="templates" className="px-6 max-w-6xl mx-auto space-y-8 scroll-mt-20">
        <div className="border-b border-border pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-accent">Category & Template Blueprints</div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary mt-1">
              Choose Your Platform Template
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl">
              Select a pre-architected blueprint configured with industry-specific forms, multi-stage workflows, role permissions, and service catalogs.
            </p>
          </div>

          <Button
            onClick={() => handleBuildPlatform()}
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
          >
            <span>Custom Setup</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {templatesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : templates && templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <Card
                key={template._id}
                className="p-6 sm:p-8 border border-border hover:border-accent/60 transition-all flex flex-col justify-between space-y-6 bg-surface hover:bg-surface-elevated rounded-2xl group shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
                      <Layers className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                      Production Ready
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-text-primary group-hover:text-accent transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mt-2">
                      {template.description ||
                        'Complete turnkey platform blueprint with citizen discovery portal, operator desk, and workflow engines.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-text-secondary">
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg border border-border">
                      <Users className="w-3.5 h-3.5 text-accent" />
                      <span>Citizen Portal</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg border border-border">
                      <Workflow className="w-3.5 h-3.5 text-accent" />
                      <span>Workflow Engine</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg border border-border">
                      <CreditCard className="w-3.5 h-3.5 text-accent" />
                      <span>Payment Ledger</span>
                    </div>
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-bg border border-border">
                      <FolderLock className="w-3.5 h-3.5 text-accent" />
                      <span>Digital Locker</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-text-tertiary font-mono">
                    Category: <strong className="text-text-secondary">{template.category || 'General'}</strong>
                  </span>
                  <Button
                    onClick={() => handleBuildPlatform(template.slug)}
                    className="gap-2 shadow-md shadow-accent/20"
                    size="sm"
                  >
                    <span>Select Template & Build Platform</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          // Default fallback template showcase
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 sm:p-8 border border-border rounded-2xl space-y-6 bg-surface">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-text-primary">Common Service Center (CSC) & Kendra OS</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Turnkey citizen service delivery platform equipped with PAN/Aadhaar validated dynamic forms, queue lobby TV screens, operator desks, and encrypted document lockers.
                </p>
              </div>
              <Button onClick={() => handleBuildPlatform('digital-service-center')} className="gap-2">
                <span>Select & Build Platform</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>

            <Card className="p-6 sm:p-8 border border-border rounded-2xl space-y-6 bg-surface">
              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-text-primary">Coaching & Education Management</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  Student application submissions, batch scheduling, fee collection installments, printable receipts, and digital certificate delivery vault.
                </p>
              </div>
              <Button onClick={() => handleBuildPlatform('coaching-institute')} variant="outline" className="gap-2">
                <span>Select & Build Platform</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          </div>
        )}
      </section>

      {/* How It Works: The 4-Step Provisioning Cycle */}
      <section className="px-6 max-w-6xl mx-auto space-y-8">
        <div className="border-b border-border pb-4">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-accent">Autonomous Architecture</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary mt-1">
            How Your Platform Is Provisioned & Launched
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            From tenant selection to full multi-tenant isolated operation in 4 deterministic steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl border border-border bg-surface space-y-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent font-mono font-bold flex items-center justify-center text-sm">
              01
            </div>
            <h3 className="font-bold text-text-primary text-base">Select Blueprint</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Pick your category template (CSC, Education, Citizen Kendra) to automatically seed form definitions and workflow stages.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-surface space-y-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning font-mono font-bold flex items-center justify-center text-sm">
              02
            </div>
            <h3 className="font-bold text-text-primary text-base">Choose Slug & Address</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Pick a unique address like <code className="text-accent font-mono">my-csc.usesetu.com</code> or connect your custom apex CNAME domain.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-surface space-y-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 text-success font-mono font-bold flex items-center justify-center text-sm">
              03
            </div>
            <h3 className="font-bold text-text-primary text-base">Atomic Provisioning</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Backend creates isolated tenant schema, provisions default Free subscription quotas, and sets up audit logs.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-surface space-y-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent font-mono font-bold flex items-center justify-center text-sm">
              04
            </div>
            <h3 className="font-bold text-text-primary text-base">Launch Admin Console</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Immediate redirection to your tenant's dedicated Admin Panel to manage staff, services, forms, and live queues.
            </p>
          </div>
        </div>
      </section>

      {/* SaaS Pricing & Plans Section (Dynamic from Backend) */}
      <section id="pricing" className="px-6 max-w-6xl mx-auto space-y-8 scroll-mt-20">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-accent">Transparent SaaS Pricing</div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Simple, Predictable Plans for Growing Platforms
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Start completely free. Upgrade anytime as your citizen service volume and staff operators expand.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center p-1 bg-surface rounded-xl border border-border mt-4">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.2 rounded font-mono font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        ) : plans && plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const price = billingCycle === 'yearly' ? plan.pricing?.yearly || 0 : plan.pricing?.monthly || 0;
              const isPopular = plan.slug === 'professional' || plan.slug === 'starter';

              return (
                <Card
                  key={plan._id}
                  className={`p-6 sm:p-8 rounded-2xl border flex flex-col justify-between space-y-6 ${
                    isPopular
                      ? 'border-accent bg-surface-elevated shadow-xl shadow-accent/10 relative'
                      : 'border-border bg-surface'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-text-primary">{plan.name}</h3>
                      <p className="text-xs text-text-secondary mt-1">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-3xl sm:text-4xl font-extrabold text-text-primary">
                        ₹{price}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>

                    <ul className="space-y-2.5 pt-4 border-t border-border text-xs text-text-secondary">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success shrink-0" />
                        <span>{plan.entitlements?.activeUsers?.limit ? `${plan.entitlements.activeUsers.limit} Operator Seats` : 'Unlimited Operator Seats'}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success shrink-0" />
                        <span>{plan.entitlements?.storage?.limit ? `${plan.entitlements.storage.limit} MB Storage` : 'Cloud Document Vault'}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success shrink-0" />
                        <span>{plan.entitlements?.customDomain?.enabled ? 'Custom Domain (CNAME/TXT)' : 'Default Subdomain'}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-success shrink-0" />
                        <span>{plan.entitlements?.monthlyRequests?.limit ? `${plan.entitlements.monthlyRequests.limit} Monthly Requests` : 'Service Requests & Queue'}</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => handleBuildPlatform()}
                    variant={isPopular ? 'primary' : 'outline'}
                    className="w-full font-bold"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-8 rounded-2xl border border-border bg-surface space-y-6">
              <div>
                <h3 className="text-xl font-bold text-text-primary">Free Tier</h3>
                <p className="text-xs text-text-secondary mt-1">For new centers & test platforms.</p>
                <div className="text-3xl font-bold text-text-primary font-mono mt-4">₹0</div>
              </div>
              <ul className="space-y-2.5 text-xs text-text-secondary">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 5 Operator Seats</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 500 MB Document Storage</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Default Subdomain</li>
              </ul>
              <Button onClick={() => handleBuildPlatform()} variant="outline" className="w-full">
                Start Free
              </Button>
            </Card>

            <Card className="p-8 rounded-2xl border border-accent bg-surface-elevated shadow-xl space-y-6">
              <div>
                <h3 className="text-xl font-bold text-text-primary">Professional</h3>
                <p className="text-xs text-text-secondary mt-1">For active service kendras.</p>
                <div className="text-3xl font-bold text-text-primary font-mono mt-4">₹499<span className="text-xs font-normal">/mo</span></div>
              </div>
              <ul className="space-y-2.5 text-xs text-text-secondary">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Unlimited Operator Seats</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Custom CNAME Domain</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 10 GB Storage & TV Display</li>
              </ul>
              <Button onClick={() => handleBuildPlatform()} className="w-full">
                Build Platform
              </Button>
            </Card>

            <Card className="p-8 rounded-2xl border border-border bg-surface space-y-6">
              <div>
                <h3 className="text-xl font-bold text-text-primary">Enterprise</h3>
                <p className="text-xs text-text-secondary mt-1">For multi-center regional networks.</p>
                <div className="text-3xl font-bold text-text-primary font-mono mt-4">₹1,499<span className="text-xs font-normal">/mo</span></div>
              </div>
              <ul className="space-y-2.5 text-xs text-text-secondary">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Multi-Center Routing</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Dedicated SLA Support</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> Automated Brevo SMS/Email</li>
              </ul>
              <Button onClick={() => handleBuildPlatform()} variant="outline" className="w-full">
                Contact Sales
              </Button>
            </Card>
          </div>
        )}
      </section>

      {/* Bottom Conversion CTA */}
      <section className="px-6 max-w-6xl mx-auto">
        <div className="border border-border bg-gradient-to-r from-surface via-surface-elevated to-surface rounded-3xl p-8 md:p-14 text-center space-y-6 shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-text-primary">
            Ready to Launch Your Autonomous Service Platform?
          </h2>
          <p className="text-sm text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Deploy your dedicated multi-tenant workspace with isolated databases, customized forms, live queue displays, and instant payments.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Button
              size="lg"
              onClick={() => handleBuildPlatform()}
              className="gap-2 px-8 py-4 text-base font-bold bg-accent hover:bg-accent-hover text-white shadow-xl shadow-accent/25"
            >
              <span>Build Your Own Platform Now</span>
              <ArrowRight className="w-5 h-5" />
            </Button>

            {isAuthenticated ? (
              <Link to="/platform">
                <Button variant="outline" size="lg" className="gap-2">
                  <Laptop className="w-4 h-4 text-accent" />
                  <span>Platform Console</span>
                </Button>
              </Link>
            ) : (
              <Link to="/login?redirect=%2Fplatform">
                <Button variant="outline" size="lg">
                  Sign In to Platform
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
