import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Activity,
  Cpu,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';
import { superAdminApi } from '../../../services/superAdmin.api';
import type { SuperAdminOverview } from '../../../types/superAdmin.types';

export const SuperAdminDashboard: React.FC = () => {
  const [data, setData] = useState<SuperAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getOverview();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch global overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-text-secondary">Loading Master Telemetry...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center bg-surface border border-border rounded-xl">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="font-bold text-text-primary text-base">{error}</p>
        <button
          onClick={fetchOverview}
          className="mt-4 px-4 py-2 bg-accent text-white font-semibold text-xs rounded-lg hover:bg-accent-hover transition-colors"
        >
          Retry Fetch
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-surface to-surface-elevated border border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
              Global Platform Overview
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                data?.system.status === 'operational'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              }`}
            >
              {data?.system.status}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Real-time aggregate telemetry across all CSC centers, customer requests, subscriptions, and revenue.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border hover:bg-surface-elevated text-xs font-semibold text-text-secondary transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/platform/super-admin/tenants"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover text-xs font-bold shadow-md shadow-accent/20 transition-colors"
          >
            <span>Inspect All Tenants</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Grid - Row 1: Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tenants / CSCs */}
        <div className="bg-surface p-5 rounded-xl border border-border relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">All CSC Centers</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">{data?.platform.totalTenants || 0}</div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary font-medium">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{data?.platform.activeTenants || 0} Active</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400">{data?.platform.suspendedTenants || 0} Suspended</span>
            </div>
          </div>
        </div>

        {/* Global Users */}
        <div className="bg-surface p-5 rounded-xl border border-border relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Platform Users</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">{data?.users.total || 0}</div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary font-medium">
              <span>{data?.users.customers || 0} Citizens</span>
              <span>•</span>
              <span>{data?.users.staffAndAdmins || 0} Staff/Admins</span>
            </div>
          </div>
        </div>

        {/* Total Platform Revenue */}
        <div className="bg-surface p-5 rounded-xl border border-border relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Gross Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">
              ₹{(data?.revenue.totalAmount || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary font-medium">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                ₹{(data?.revenue.monthToDate || 0).toLocaleString('en-IN')} MTD
              </span>
            </div>
          </div>
        </div>

        {/* Citizen Requests */}
        <div className="bg-surface p-5 rounded-xl border border-border relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Citizen Requests</span>
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-text-primary">{data?.requests.total || 0}</div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary font-medium">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{data?.requests.completed || 0} Completed</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400">{data?.requests.pending || 0} Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid - Row 2: Subscriptions & System Watchdog */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Tiers Card */}
        <div className="bg-surface p-6 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">Subscription Tiers</h2>
            </div>
            <Link
              to="/platform/super-admin/plans"
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
            >
              <span>Manage Plans</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border">
              <span className="text-[10px] uppercase font-bold text-text-tertiary">Total Active</span>
              <div className="text-xl font-extrabold text-text-primary mt-1">{data?.subscriptions.active || 0}</div>
            </div>
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border">
              <span className="text-[10px] uppercase font-bold text-text-tertiary">Past Due</span>
              <div className="text-xl font-extrabold text-amber-500 mt-1">{data?.subscriptions.pastDue || 0}</div>
            </div>
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border">
              <span className="text-[10px] uppercase font-bold text-text-tertiary">Cancelled</span>
              <div className="text-xl font-extrabold text-text-tertiary mt-1">{data?.subscriptions.cancelled || 0}</div>
            </div>
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border">
              <span className="text-[10px] uppercase font-bold text-text-tertiary">Services Catalog</span>
              <div className="text-xl font-extrabold text-text-primary mt-1">{data?.requests.totalServicesOffered || 0}</div>
            </div>
          </div>

          {/* Tier breakdown breakdown */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-text-secondary">Subscribers by Plan:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(data?.subscriptions.tiers || {}).map(([planName, count]) => (
                <div key={planName} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-elevated border border-border text-xs">
                  <span className="font-semibold text-text-primary">{planName}</span>
                  <span className="font-extrabold text-accent">{count} centers</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System & Telemetry Watchdog */}
        <div className="bg-surface p-6 rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">System & Telemetry Watchdog</h2>
            </div>
            <Link
              to="/platform/super-admin/operations"
              className="text-xs font-bold text-accent hover:underline flex items-center gap-1"
            >
              <span>Deep Telemetry</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border">
              <span className="text-[10px] uppercase font-bold text-text-tertiary">DB Latency</span>
              <div className="text-xl font-extrabold text-text-primary mt-1">{data?.system.database.latencyMs || 0} ms</div>
            </div>
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border">
              <span className="text-[10px] uppercase font-bold text-text-tertiary">API RPM</span>
              <div className="text-xl font-extrabold text-text-primary mt-1">{data?.system.requestsPerMinute || 0}</div>
            </div>
            <div className="p-3.5 rounded-lg bg-surface-elevated border border-border">
              <span className="text-[10px] uppercase font-bold text-text-tertiary">P95 Latency</span>
              <div className="text-xl font-extrabold text-text-primary mt-1">{data?.system.p95Ms || 0} ms</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${(data?.system.openIncidentsCount || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
              <span className="font-semibold text-text-primary">Open Incidents</span>
            </div>
            <span className={`font-extrabold ${(data?.system.openIncidentsCount || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {data?.system.openIncidentsCount || 0} active
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated border border-border text-xs">
            <div className="flex items-center gap-2">
              <Bug className={`w-4 h-4 ${(data?.system.unresolvedErrorsCount || 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
              <span className="font-semibold text-text-primary">Unresolved Critical Errors</span>
            </div>
            <span className={`font-extrabold ${(data?.system.unresolvedErrorsCount || 0) > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {data?.system.unresolvedErrorsCount || 0} errors
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
