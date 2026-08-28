import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ActivitySquare,
  CreditCard,
  TrendingUp,
  Cpu,
  AlertTriangle,
  Bug,
  ServerCog,
  ShieldAlert,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  Crown,
  Radio,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const SuperAdminLayout: React.FC = () => {
  const { user, clearSession } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Overview', path: '/platform/super-admin', icon: LayoutDashboard, exact: true },
    { name: 'Tenants / CSCs', path: '/platform/super-admin/tenants', icon: Building2, exact: false },
    { name: 'Request Watchdog', path: '/platform/super-admin/requests', icon: ActivitySquare, exact: false },
    { name: 'Plans & Pricing', path: '/platform/super-admin/plans', icon: CreditCard, exact: false },
    { name: 'Revenue Analytics', path: '/platform/super-admin/revenue', icon: TrendingUp, exact: false },
    { name: 'System Operations', path: '/platform/super-admin/operations', icon: Cpu, exact: false },
    { name: 'Incidents', path: '/platform/super-admin/incidents', icon: AlertTriangle, exact: false },
    { name: 'Error Tracker', path: '/platform/super-admin/errors', icon: Bug, exact: false },
    { name: 'Background Jobs', path: '/platform/super-admin/jobs', icon: ServerCog, exact: false },
    { name: 'Security & Audit', path: '/platform/super-admin/security', icon: ShieldAlert, exact: false },
  ];

  const isLinkActive = (path: string, exact: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Super Admin Badges */}
          <div className="flex items-center gap-3">
            <Link to="/platform/super-admin" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-black text-lg">
                <Crown className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight text-text-primary group-hover:text-accent transition-colors">
                    UseSetu
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    SUPER ADMIN
                  </span>
                </div>
                <span className="text-[10px] font-medium tracking-wide text-text-tertiary">
                  MASTER CONTROL CENTER
                </span>
              </div>
            </Link>
          </div>

          {/* Right Tools */}
          <div className="flex items-center gap-3">
            {/* Live Telemetry Ping */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Platform Online</span>
            </div>

            {/* Back to Tenant Control Plane */}
            <Link
              to="/platform"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-elevated hover:bg-border/40 text-xs font-semibold text-text-secondary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Platform View</span>
            </Link>

            {/* Dark / Light Mode Switcher */}
            <ThemeToggle />

            {/* User Profile & Logout */}
            <div className="flex items-center gap-3 pl-3 border-l border-border">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-text-primary leading-tight">{user?.name || 'Super Admin'}</span>
                <span className="text-[10px] text-text-tertiary">{user?.email || 'admin@usesetu.local'}</span>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <aside
          className={`lg:w-64 flex-shrink-0 ${
            mobileMenuOpen ? 'block' : 'hidden lg:block'
          } space-y-6`}
        >
          <div className="bg-surface rounded-xl border border-border p-3 shadow-sm sticky top-24">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
              Global Platform Control
            </div>
            <nav className="space-y-1 mt-1">
              {navLinks.map((link) => {
                const active = isLinkActive(link.path, link.exact);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      active
                        ? 'bg-accent text-white shadow-sm shadow-accent/30 font-bold'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-text-tertiary'}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
