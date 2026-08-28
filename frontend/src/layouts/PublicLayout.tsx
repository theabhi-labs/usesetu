import { useMemo } from 'react';
import { Outlet, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { cmsApi } from '../services/cms.api';
import { getTenantContext } from '../lib/tenant';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/common/ThemeToggle';
import {
  Sparkles,
  Laptop,
  Lock,
  Search,
  Monitor,
  ArrowRight,
  Layers,
  CreditCard,
  Building2,
  ExternalLink,
} from 'lucide-react';

export function PublicLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const tenantParam = searchParams.get('tenant') || searchParams.get('app');

  const tenantContext = useMemo(() => {
    return getTenantContext();
  }, [tenantParam]);

  const settingsQuery = useQuery({
    queryKey: ['cmsSettings', tenantParam],
    queryFn: cmsApi.getSettings,
    enabled: tenantContext.isTenantApplication,
  });

  const headerMenuQuery = useQuery({
    queryKey: ['cmsMenu', 'header', tenantParam],
    queryFn: () => cmsApi.getMenu('header'),
    enabled: tenantContext.isTenantApplication,
  });

  const footerMenuQuery = useQuery({
    queryKey: ['cmsMenu', 'footer', tenantParam],
    queryFn: () => cmsApi.getMenu('footer'),
    enabled: tenantContext.isTenantApplication,
  });

  const settings = settingsQuery.data;
  const headerLinks = headerMenuQuery.data || [];
  const footerLinks = footerMenuQuery.data || [];

  const websiteName = settings?.cscName || settings?.websiteName || 'UseSetu';
  const isMaintenance = settings?.maintenanceMode?.enabled;
  const isStaff = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'staff');

  const handleBuildPlatform = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=%2Fplatform%2Fcreate-app');
    } else {
      navigate('/platform/create-app');
    }
  };

  if (isMaintenance && !isStaff && tenantContext.isTenantApplication) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-bg text-text-primary">
        <div className="w-16 h-16 rounded-full bg-warning/15 flex items-center justify-center text-warning border border-warning/30 animate-pulse text-2xl font-bold">
          !
        </div>
        <h1 className="text-3xl font-bold mt-6 tracking-tight select-none">Service Center Under Maintenance</h1>
        <p className="text-text-secondary mt-2 max-w-md leading-relaxed select-none">
          {settings?.maintenanceMode?.message || 'This portal is currently down for scheduled maintenance. Please check back later.'}
        </p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ROOT SAAS PLATFORM LAYOUT (usesetu.com / localhost:5173)
  // ═══════════════════════════════════════════════════════════════════════════
  if (tenantContext.isRootPlatform) {
    return (
      <div className="min-h-screen flex flex-col bg-bg text-text-primary selection:bg-accent selection:text-white">
        {/* SaaS Platform Header */}
        <header className="h-16 border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 px-6 shrink-0 z-50 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center font-bold text-white shadow-md shadow-accent/20 font-mono text-base">
              U
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-text-primary font-sans group-hover:text-accent transition-colors">
                UseSetu
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/15 border border-accent/30 text-accent">
                SaaS Platform
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <a href="/#templates" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-accent" /> Templates
            </a>
            <a href="/#pricing" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-success" /> Pricing
            </a>
            <Link to="/?tenant=demo" className="text-xs font-medium text-text-secondary hover:text-accent transition-colors flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> Live Citizen Demo
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <>
                <Link
                  to="/platform"
                  className="hidden sm:flex text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-primary transition-colors items-center gap-1.5"
                >
                  <Laptop className="w-3.5 h-3.5 text-accent" /> Platform Console
                </Link>
                <Button size="sm" onClick={handleBuildPlatform} className="gap-1 text-xs">
                  <span>Build Platform</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login?redirect=%2Fplatform"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  Sign In
                </Link>
                <Button size="sm" onClick={handleBuildPlatform} className="gap-1.5 text-xs shadow-md shadow-accent/20">
                  <span>Build Your Own Platform</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </header>

        <main className="flex-grow">
          <Outlet />
        </main>

        {/* SaaS Platform Footer */}
        <footer className="border-t border-border bg-surface py-12 px-6 shrink-0 select-none text-left">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-text-secondary">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center font-bold text-white font-mono text-xs">
                  U
                </div>
                <span className="font-bold text-base text-text-primary font-sans">UseSetu SaaS Platform</span>
              </div>
              <p className="text-text-tertiary leading-relaxed">
                Empowering Digital Service Kendras, CSCs, and Enterprises to deploy autonomous digital service networks on dedicated cloud tenants.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="font-bold text-text-primary uppercase tracking-wider text-[11px] font-mono">Platform Blueprints</div>
              <ul className="space-y-2">
                <li><a href="/#templates" className="hover:text-accent transition-colors">Common Service Center (CSC)</a></li>
                <li><a href="/#templates" className="hover:text-accent transition-colors">Coaching & Training Institute</a></li>
                <li><a href="/#templates" className="hover:text-accent transition-colors">School & Academic Desk</a></li>
                <li><a href="/#pricing" className="hover:text-accent transition-colors">Commercial Plans & Pricing</a></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="font-bold text-text-primary uppercase tracking-wider text-[11px] font-mono">Platform Tools</div>
              <ul className="space-y-2">
                <li><Link to="/platform" className="hover:text-accent transition-colors">Platform Control Plane</Link></li>
                <li><Link to="/platform/create-app" className="hover:text-accent transition-colors">Provision New Application</Link></li>
                <li><Link to="/platform/billing" className="hover:text-accent transition-colors">Tenant Subscriptions & Billing</Link></li>
                <li><Link to="/dev/ui" className="hover:text-accent transition-colors">Design System / Kitchen Sink</Link></li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="font-bold text-text-primary uppercase tracking-wider text-[11px] font-mono">Account & Legal</div>
              <ul className="space-y-2">
                <li><Link to="/login?redirect=%2Fplatform" className="hover:text-accent transition-colors">Platform Sign In</Link></li>
                <li><Link to="/register?redirect=%2Fplatform" className="hover:text-accent transition-colors">Create Account</Link></li>
                <li><Link to="/pages/terms-and-conditions" className="hover:text-accent transition-colors">Terms of Service</Link></li>
                <li><Link to="/pages/privacy-policy" className="hover:text-accent transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>

          <div className="max-w-6xl mx-auto border-t border-border mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-text-tertiary">
            <p>© {new Date().getFullYear()} UseSetu SaaS Platform. All rights reserved.</p>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="text-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Multi-Tenant Provisioning Active
              </span>
              <span>•</span>
              <span>React 19 + Node.js</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. TENANT APPLICATION LAYOUT (<slug>.usesetu.com / ?tenant=<slug>)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen flex flex-col bg-bg text-text-primary selection:bg-accent selection:text-white">
      {/* Tenant Header */}
      <header className="h-16 border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 px-6 shrink-0 z-50 flex items-center justify-between">
        <Link to={tenantParam ? `/?tenant=${tenantParam}` : '/'} className="flex items-center gap-2.5 group">
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="logo" className="h-8 w-auto max-h-8" />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-accent flex items-center justify-center font-bold text-white shadow-md font-mono text-base">
              {websiteName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-lg tracking-tight text-text-primary font-sans group-hover:text-accent transition-colors">
              {websiteName}
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface border border-border text-text-secondary">
              Citizen Portal
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#services" className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors">
            Services
          </a>
          <Link
            to={tenantParam ? `/track?tenant=${tenantParam}` : '/track'}
            className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" /> Track Application
          </Link>
          <Link
            to={tenantParam ? `/queue-display?tenant=${tenantParam}` : '/queue-display'}
            className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
          >
            <Monitor className="w-3.5 h-3.5" /> TV Display
          </Link>

          {headerLinks
            .filter((item) => item.isActive)
            .map((item) => {
              const linkUrl = tenantParam && item.url.startsWith('/') && !item.url.includes('?')
                ? `${item.url}?tenant=${tenantParam}`
                : item.url;
              return (
                <Link
                  key={item.key}
                  to={linkUrl}
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to={
                user?.role === 'customer'
                  ? tenantParam ? `/portal?tenant=${tenantParam}` : '/portal'
                  : tenantParam ? `/admin?tenant=${tenantParam}` : '/admin'
              }
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors flex items-center gap-1.5 shadow-sm"
            >
              Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                to={tenantParam ? `/admin?tenant=${tenantParam}` : '/admin'}
                className="hidden sm:flex text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-elevated text-text-primary transition-colors items-center gap-1.5"
              >
                <Laptop className="w-3.5 h-3.5 text-accent" /> Staff Desk
              </Link>
              <Link
                to={tenantParam ? `/login?tenant=${tenantParam}` : '/login'}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors flex items-center gap-1.5 shadow-sm"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Tenant Citizen Footer */}
      <footer className="border-t border-border bg-surface py-12 px-6 shrink-0 select-none text-left">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-text-secondary">
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center font-bold text-white font-mono text-xs">
                {websiteName.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-base text-text-primary font-sans">{websiteName}</span>
            </div>
            <p className="text-text-tertiary leading-relaxed">
              Digital citizen services, certificate applications, token queue kiosks, and document lockers.
            </p>
            {settings?.contact?.email && <p className="text-text-tertiary">Support: {settings.contact.email}</p>}
          </div>

          <div className="space-y-2.5">
            <div className="font-bold text-text-primary uppercase tracking-wider text-[11px] font-mono">Citizen Tools</div>
            <ul className="space-y-2">
              <li><a href="#services" className="hover:text-accent transition-colors">Citizen Service Catalog</a></li>
              <li>
                <Link to={tenantParam ? `/track?tenant=${tenantParam}` : '/track'} className="hover:text-accent transition-colors">
                  Track Application Status
                </Link>
              </li>
              <li>
                <Link to={tenantParam ? `/portal?tenant=${tenantParam}` : '/portal'} className="hover:text-accent transition-colors">
                  Customer Digital Portal
                </Link>
              </li>
              <li>
                <Link to={tenantParam ? `/portal/locker?tenant=${tenantParam}` : '/portal/locker'} className="hover:text-accent transition-colors">
                  Encrypted Document Locker
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold text-text-primary uppercase tracking-wider text-[11px] font-mono">Operator & Desks</div>
            <ul className="space-y-2">
              <li>
                <Link to={tenantParam ? `/admin/queue?tenant=${tenantParam}` : '/admin/queue'} className="hover:text-accent transition-colors">
                  Queue Counter Operator
                </Link>
              </li>
              <li>
                <Link to={tenantParam ? `/queue-display?tenant=${tenantParam}` : '/queue-display'} className="hover:text-accent transition-colors">
                  TV Lobby Queue Display
                </Link>
              </li>
              <li>
                <Link to={tenantParam ? `/admin/requests?tenant=${tenantParam}` : '/admin/requests'} className="hover:text-accent transition-colors">
                  Requests & Workflow Center
                </Link>
              </li>
              <li>
                <Link to={tenantParam ? `/admin?tenant=${tenantParam}` : '/admin'} className="hover:text-accent transition-colors">
                  Admin Console
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <div className="font-bold text-text-primary uppercase tracking-wider text-[11px] font-mono">Powered By</div>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-accent font-semibold flex items-center gap-1 hover:underline">
                  <Sparkles className="w-3 h-3" /> UseSetu SaaS Platform
                </Link>
              </li>
              <li>
                <Link to={tenantParam ? `/pages/terms-and-conditions?tenant=${tenantParam}` : '/pages/terms-and-conditions'} className="hover:text-accent transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to={tenantParam ? `/pages/privacy-policy?tenant=${tenantParam}` : '/pages/privacy-policy'} className="hover:text-accent transition-colors">
                  Privacy Policy
                </Link>
              </li>
              {footerLinks
                .filter((item) => item.isActive)
                .map((item) => {
                  const linkUrl = tenantParam && item.url.startsWith('/') && !item.url.includes('?')
                    ? `${item.url}?tenant=${tenantParam}`
                    : item.url;
                  return (
                    <li key={item.key}>
                      <Link
                        to={linkUrl}
                        target={item.openInNewTab ? '_blank' : undefined}
                        rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                        className="hover:text-accent transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto border-t border-border mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-text-tertiary">
          <p>© {new Date().getFullYear()} {websiteName}. Powered by UseSetu.</p>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span className="text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Active Kendra OS
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
