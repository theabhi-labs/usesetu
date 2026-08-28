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
        <div className="h-44 bg-surface-elevated border border-border rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-surface-elevated border border-border rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-surface-elevated border border-border rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-error/10 border border-error/20 rounded-3xl p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-error mx-auto" />
        <h3 className="text-lg font-bold text-text-primary">Failed to load platform dashboard</h3>
        <p className="text-xs text-text-secondary max-w-md mx-auto">
          {(error as any)?.response?.data?.message || (error as any)?.message || 'An error occurred while fetching platform data.'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-surface-elevated hover:bg-surface text-xs font-semibold rounded-xl text-text-primary border border-border cursor-pointer"
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
      <div className="relative overflow-hidden bg-surface border border-border p-6 sm:p-8 rounded-3xl shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-accent text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>{data?.account?.name || 'Account Overview'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              UseSetu Platform Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed">
              Unified control plane to monitor your Common Service Centers, multi-tenant domains, subscription entitlements, and cloud usage.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/platform/create-app"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg shadow-accent/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Application</span>
            </Link>

            <Link
              to="/platform/billing"
              className="inline-flex items-center space-x-2 bg-surface-elevated hover:bg-surface border border-border text-text-primary text-xs font-bold px-4 py-3 rounded-2xl transition-colors shrink-0"
            >
              <CreditCard className="w-4 h-4 text-text-tertiary" />
              <span>Billing & Plans</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Apps */}
        <div className="bg-surface border border-border rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">
              Applications
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-text-primary">{metrics.totalApplications}</span>
              <span className="text-xs text-success font-semibold">{metrics.activeApplications} active</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
        </div>

        {/* Attention Apps */}
        <div className="bg-surface border border-border rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">
              Attention Required
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-text-primary">{metrics.attentionApplications}</span>
              <span className="text-xs text-text-tertiary font-medium">alerts & quotas</span>
            </div>
          </div>
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              metrics.attentionApplications > 0
                ? 'bg-warning/10 text-warning'
                : 'bg-success/10 text-success'
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
        <div className="bg-surface border border-border rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">
              Storage Used
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-text-primary">
                {formatBytes(metrics.totalStorageUsed)}
              </span>
              <span className="text-xs text-text-tertiary font-medium">across centers</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        {/* Staff Seats */}
        <div className="bg-surface border border-border rounded-3xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">
              Active Staff Seats
            </span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-text-primary">{metrics.totalActiveUsers}</span>
              <span className="text-xs text-text-tertiary font-medium">operator seats</span>
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
            <h2 className="text-lg font-black text-text-primary">Your Applications</h2>
            <p className="text-xs text-text-secondary">Manage and launch your provisioned CSC centers</p>
          </div>

          <Link
            to="/platform/applications"
            className="text-xs font-bold text-accent hover:opacity-80 flex items-center space-x-1"
          >
            <span>View All ({applications.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Applications Grid */}
        {applications.length === 0 ? (
          <div className="bg-surface-elevated border border-dashed border-border rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto text-text-tertiary border border-border">
              <Server className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">No Applications Found</h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Launch your first digital service center with our instant template provisioning pipeline.
            </p>
            <div className="pt-2">
              <Link
                to="/platform/create-app"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-accent/20"
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
        <div className="bg-surface border border-border rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-2 text-text-primary">
            <Activity className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
              Recent Platform Activity
            </h3>
          </div>

          <div className="divide-y divide-border text-xs">
            {recentActivity.map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-text-primary block">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[11px] text-text-tertiary">
                    {log.reason || `Plan updated: ${log.oldPlan || 'Free'} → ${log.newPlan || 'Pro'}`}
                  </span>
                </div>
                <span className="text-[11px] text-text-tertiary shrink-0">
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
