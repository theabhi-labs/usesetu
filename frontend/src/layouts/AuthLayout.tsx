import * as React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from '../components/common/ThemeToggle';
import {
  Layers,
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  Lock,
  FileCheck2,
  Users2,
  ArrowLeft,
} from 'lucide-react';

export function AuthLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';

  // Extract query params to preserve redirects and tenant context
  const search = location.search;

  return (
    <div className="min-h-screen flex bg-bg text-text-primary transition-colors duration-200">
      {/* Top Floating Header */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <Link
          to="/"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface/80 backdrop-blur-md border border-border hover:bg-surface-elevated text-xs font-semibold text-text-secondary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Left panel: Auth Form & Navigation Switcher */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-16 xl:px-20 py-12">
        <div className="mx-auto w-full max-w-md">
          {/* Logo & Brand */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/25 group-hover:scale-105 transition-transform duration-200 text-white">
                <Layers className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-black text-2xl tracking-tight text-text-primary">
                    UseSetu
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
                    SaaS OS
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-text-tertiary">
                  Digital Service Center Operating System
                </span>
              </div>
            </Link>
          </div>

          {/* Quick Tabbed Switcher (Sign In vs Create Account) */}
          {(isLoginPage || isRegisterPage) && (
            <div className="mb-6 p-1 bg-surface-elevated border border-border rounded-xl flex items-center gap-1">
              <Link
                to={`/login${search}`}
                className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                  isLoginPage
                    ? 'bg-accent text-white shadow-sm shadow-accent/25'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sign In
              </Link>
              <Link
                to={`/register${search}`}
                className={`flex-1 text-center py-2 rounded-lg text-xs font-bold transition-all ${
                  isRegisterPage
                    ? 'bg-accent text-white shadow-sm shadow-accent/25'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Create Account
              </Link>
            </div>
          )}

          {/* Form Content */}
          <div className="bg-surface/50 sm:bg-surface border border-border/50 sm:border-border rounded-2xl p-6 sm:p-8 shadow-sm">
            <Outlet />
          </div>

          {/* Footer note */}
          <div className="mt-8 text-center text-xs text-text-tertiary">
            Protected with 256-bit SSL encryption & RBAC security.
          </div>
        </div>
      </div>

      {/* Right panel: Production Feature Showcase */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-surface via-surface-elevated/80 to-surface border-l border-border relative overflow-hidden flex-col justify-between p-12 xl:p-16">
        {/* Background decorative glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header & Tagline */}
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent border border-accent/25">
            <Zap className="w-3.5 h-3.5" />
            <span>Next-Gen CSC Cloud Platform</span>
          </div>
          <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-text-primary leading-tight">
            The Complete Operating System for Citizen Service Centers.
          </h2>
          <p className="text-text-secondary text-sm leading-relaxed max-w-lg">
            Provision, manage, and scale your Jan Seva Kendra, Cyber Cafe, or Citizen Service Point with end-to-end digital workflows, token queues, and instant certificate deliveries.
          </p>
        </div>

        {/* Core Value Props Grid */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
          <div className="p-4 rounded-xl bg-surface/80 border border-border backdrop-blur-sm space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-text-primary">100+ Citizen Services</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Pre-built forms for Income, Caste, PAN, Aadhaar, and Welfare schemes with automated validation.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/80 border border-border backdrop-blur-sm space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-text-primary">Isolated Subdomains</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Dedicated citizen portals on your own subdomain or custom domain with automated SSL.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/80 border border-border backdrop-blur-sm space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-text-primary">Live Token Desk</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Real-time physical counter queue management, digital appointment booking, and TV displays.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface/80 border border-border backdrop-blur-sm space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs text-text-primary">Digital Locker & Wallet</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Secure citizen document locker, Razorpay payment integrations, and instant digital receipts.
            </p>
          </div>
        </div>

        {/* Bottom Trust Badge */}
        <div className="relative z-10 pt-6 border-t border-border flex items-center justify-between text-xs text-text-tertiary">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-text-secondary">Production Ready • Multi-Tenant Core</span>
          </div>
          <span className="font-mono text-[11px]">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
