import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  Server,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Users,
  CreditCard,
  Sparkles,
  ArrowRight,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { DashboardData } from '../../services/platform.api';
import { ApplicationCard } from '../../components/platform/ApplicationCard';
import { formatBytes } from '../../components/platform/UsageGauge';

export const PlatformDashboard: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData>({
    queryKey: ['platform-dashboard'],
    queryFn: platformApi.getDashboard,
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-44 bg-slate-900/80 border border-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900/80 border border-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-slate-900/80 border border-slate-800 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-rose-950/20 border border-rose-800/40 rounded-3xl p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-rose-200">Failed to load platform dashboard</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {(error as any)?.response?.data?.message || (error as any)?.message || 'An error occurred while fetching platform data.'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalApplications: 0,
    activeApplications: 0,
    attentionApplications: 0,
    totalStorageUsed: 0,
    totalActiveUsers: 0,
    subscriptionBreakdown: {},
  };

  const applications = data?.applications || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-orange-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>{data?.account?.name || 'Account Overview'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              UseSetu Platform Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
              Unified control plane to monitor your Common Service Centers, multi-tenant domains, subscription entitlements, and cloud usage.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/platform/create-app"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Application</span>
            </Link>

            <Link
              to="/platform/billing"
              className="inline-flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold px-4 py-3 rounded-2xl transition-colors shrink-0"
            >
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>Billing & Plans</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Apps */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Applications
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-white">{metrics.totalApplications}</span>
              <span className="text-xs text-emerald-400 font-semibold">{metrics.activeApplications} active</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
        </div>

        {/* Attention Apps */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Attention Required
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-white">{metrics.attentionApplications}</span>
              <span className="text-xs text-slate-500 font-medium">alerts & quotas</span>
            </div>
          </div>
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              metrics.attentionApplications > 0
                ? 'bg-amber-500/10 text-amber-400'
                : 'bg-emerald-500/10 text-emerald-400'
            }`}
          >
            {metrics.attentionApplications > 0 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
        </div>

        {/* Total Storage */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Storage Used
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-white">
                {formatBytes(metrics.totalStorageUsed)}
              </span>
              <span className="text-xs text-slate-500 font-medium">across centers</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        {/* Staff Seats */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Active Staff Seats
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-white">{metrics.totalActiveUsers}</span>
              <span className="text-xs text-slate-500 font-medium">operator seats</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Applications Section Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">Your Applications</h2>
            <p className="text-xs text-slate-400">Manage and launch your provisioned CSC centers</p>
          </div>

          <Link
            to="/platform/applications"
            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center space-x-1"
          >
            <span>View All ({applications.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Applications Grid */}
        {applications.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
              <Server className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">No Applications Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Launch your first digital service center with our instant template provisioning pipeline.
            </p>
            <div className="pt-2">
              <Link
                to="/platform/create-app"
                className="inline-flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Center</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.slice(0, 6).map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      {recentActivity.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-2 text-slate-300">
            <Activity className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Recent Platform Activity
            </h3>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {recentActivity.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-slate-200 block">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {log.reason || `Plan updated: ${log.oldPlan || 'Free'} → ${log.newPlan || 'Pro'}`}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0">
                  {new Date(log.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
