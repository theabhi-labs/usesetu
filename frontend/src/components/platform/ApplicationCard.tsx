import React from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  ExternalLink,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Archive,
} from 'lucide-react';
import type { ApplicationSummary } from '../../services/platform.api';
import { formatBytes } from './UsageGauge';
import { getTenantPublicUrl } from '../../lib/tenant';

interface ApplicationCardProps {
  app: ApplicationSummary;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ app }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-success/10 text-success border border-success/20">
            <CheckCircle2 className="w-3 h-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-error/10 text-error border border-error/20">
            <AlertTriangle className="w-3 h-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-elevated text-text-tertiary border border-border">
            <Archive className="w-3 h-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
      case 'provisioning':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-warning/10 text-warning border border-warning/20">
            <Clock className="w-3 h-3 animate-spin" />
            <span className="capitalize">{status}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-elevated text-text-secondary border border-border capitalize">
            {status}
          </span>
        );
    }
  };

  const primaryDomain = app.primaryDomain || app.defaultDomain;
  const storageUsed = app.usage?.storage?.used || 0;
  const storageLimit = app.usage?.storage?.limit || 1073741824;

  const storagePct = Math.min(100, Math.round((storageUsed / Math.max(storageLimit, 1)) * 100));

  return (
    <div
      className={`group bg-surface hover:bg-surface-elevated border rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between space-y-5 shadow-xs ${
        app.status === 'archived'
          ? 'border-border/40 opacity-70'
          : 'border-border hover:border-border-strong hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-text-tertiary tracking-wider uppercase">
              {app.template?.name || 'Digital Service Center'}
            </span>
          </div>
          {getStatusBadge(app.status)}
        </div>

        <Link
          to={`/platform/applications/${app.id}`}
          className="text-lg font-black text-text-primary hover:text-accent transition-colors line-clamp-1 block tracking-tight"
        >
          {app.name}
        </Link>

        <div className="flex items-center space-x-1.5 text-xs text-text-secondary mt-1">
          <Globe className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
          <span className="truncate max-w-[220px] font-mono text-[11px]">{primaryDomain}</span>
        </div>
      </div>

      {/* Plan & Resource Summary */}
      <div className="p-3.5 bg-surface-elevated rounded-2xl border border-border space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-tertiary">Active Plan:</span>
          <span className="font-extrabold text-[11px] text-accent bg-accent/10 px-2 py-0.5 rounded-md border border-accent/20 uppercase tracking-wide">
            {app.subscription?.plan || 'Free'}
          </span>
        </div>

        {/* Mini storage progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-text-secondary">
            <span className="flex items-center space-x-1">
              <HardDrive className="w-3 h-3 text-teal-400" />
              <span>Storage</span>
            </span>
            <span className="font-semibold text-text-primary font-mono">
              {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden border border-border/50">
            <div
              className={`h-full rounded-full transition-all ${
                storagePct > 90 ? 'bg-error' : storagePct > 75 ? 'bg-warning' : 'bg-teal-500'
              }`}
              style={{ width: `${storagePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Footer */}
      <div className="flex items-center space-x-2 pt-2 border-t border-border">
        <Link
          to={`/platform/applications/${app.id}`}
          className="flex-1 text-center py-2 px-3 bg-surface-elevated hover:bg-surface text-text-primary text-xs font-bold rounded-xl transition-all border border-border cursor-pointer"
        >
          Manage Center
        </Link>

        {app.status === 'active' && (
          <a
            href={getTenantPublicUrl(app.slug, primaryDomain)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 rounded-xl transition-colors shrink-0 cursor-pointer"
            title="Open Live Website"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};
