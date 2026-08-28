import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  LogOut,
  ShieldCheck,
  Home,
  CreditCard,
  Bell,
  User,
  Shield,
  Menu,
  X,
  Server,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ApplicationSwitcher } from '../components/platform/ApplicationSwitcher';
import { TwoFactorAlertBanner } from '../components/auth/TwoFactorAlertBanner';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { platformApi } from '../services/platform.api';
import type { NotificationsResponse } from '../services/platform.api';

export const PlatformLayout: React.FC = () => {
  const { user, clearSession } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: notificationsData } = useQuery<NotificationsResponse>({
    queryKey: ['platform-notifications'],
    queryFn: platformApi.getNotifications,
    refetchInterval: 30000,
  });

  const unreadCount = notificationsData?.unreadCount || 0;

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/platform', icon: Home, exact: true },
    { name: 'Applications', path: '/platform/applications', icon: Server, exact: false },
    { name: 'Billing & Plans', path: '/platform/billing', icon: CreditCard, exact: false },
    {
      name: 'Notifications',
      path: '/platform/notifications',
      icon: Bell,
      exact: false,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { name: 'Account Settings', path: '/platform/account', icon: User, exact: true },
    { name: 'Security', path: '/platform/account/security', icon: Shield, exact: true },
  ];

  const isLinkActive = (path: string, exact: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* 2FA Setup Alert Banner */}
      <TwoFactorAlertBanner />

      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Logo & Switcher */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            <Link to="/platform" className="flex items-center space-x-3 group shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                    UseSetu
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                    Platform
                  </span>
                </div>
              </div>
            </Link>

            {/* Application Switcher */}
            <div className="hidden md:block">
              <ApplicationSwitcher />
            </div>
          </div>

          {/* Right: Actions, Notifications, User */}
          <div className="flex items-center space-x-3">
            <Link
              to="/platform/create-app"
              className="hidden sm:inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-orange-500/20 hover:shadow-orange-500/30 transition-all duration-150 transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create App</span>
            </Link>

            {/* Notification Bell */}
            <Link
              to="/platform/notifications"
              className="relative p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors border border-transparent hover:border-border"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {/* User Profile Pill */}
            <div className="hidden sm:flex items-center space-x-3 pl-3 border-l border-slate-800">
              <Link to="/platform/account" className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-600/60 flex items-center justify-center text-orange-400 font-black text-xs shadow-inner">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-200 leading-tight truncate max-w-[120px]">
                    {user?.name || 'Account Owner'}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{user?.email}</span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                title="Log out of UseSetu"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 p-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
            <div className="pb-3 border-b border-slate-800">
              <ApplicationSwitcher />
            </div>

            <nav className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isLinkActive(link.path, link.exact);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      active
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{link.name}</span>
                    </div>
                    {link.badge && (
                      <span className="text-[10px] bg-slate-950 text-orange-400 px-2 py-0.5 rounded-full font-black">
                        {link.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <ThemeToggle variant="segmented" />
              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-error hover:opacity-80 flex items-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-60 shrink-0 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-3 shadow-sm backdrop-blur-sm space-y-1">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
              Platform Control Plane
            </div>
            <nav className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isLinkActive(link.path, link.exact);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{link.name}</span>
                    </div>
                    {link.badge ? (
                      <span className="text-[10px] bg-orange-500 text-white px-2 py-0.2 rounded-full font-black">
                        {link.badge}
                      </span>
                    ) : (
                      active && <ChevronRight className="w-3.5 h-3.5 opacity-80" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Quick Help Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-4 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-orange-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Tenant Core</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Applications run isolated database environments with automated DNS and SSL provisioning.
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Platform Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>UseSetu Platform Engine — Stage 6 Control Plane Active</span>
          </div>
          <div>© {new Date().getFullYear()} UseSetu Inc. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
