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

interface ApplicationCardProps {
  app: ApplicationSummary;
}

export const ApplicationCard: React.FC<ApplicationCardProps> = ({ app }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <Archive className="w-3 h-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
      case 'provisioning':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 animate-spin" />
            <span className="capitalize">{status}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700 capitalize">
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
      className={`group bg-slate-900/80 hover:bg-slate-900 border rounded-3xl p-6 transition-all duration-200 flex flex-col justify-between space-y-5 ${
        app.status === 'archived'
          ? 'border-slate-800/40 opacity-70'
          : 'border-slate-800 hover:border-slate-700/80 hover:shadow-xl hover:shadow-black/40'
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              {app.template?.name || 'Digital Service Center'}
            </span>
          </div>
          {getStatusBadge(app.status)}
        </div>

        <Link
          to={`/platform/applications/${app.id}`}
          className="text-lg font-black text-white hover:text-orange-400 transition-colors line-clamp-1 block tracking-tight"
        >
          {app.name}
        </Link>

        <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-1">
          <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate max-w-[220px] font-mono text-[11px]">{primaryDomain}</span>
        </div>
      </div>

      {/* Plan & Resource Summary */}
      <div className="p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Active Plan:</span>
          <span className="font-extrabold text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 uppercase tracking-wide">
            {app.subscription?.plan || 'Free'}
          </span>
        </div>

        {/* Mini storage progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400">
            <span className="flex items-center space-x-1">
              <HardDrive className="w-3 h-3 text-teal-400" />
              <span>Storage</span>
            </span>
            <span className="font-semibold text-slate-300 font-mono">
              {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                storagePct > 90 ? 'bg-rose-500' : storagePct > 75 ? 'bg-amber-500' : 'bg-teal-500'
              }`}
              style={{ width: `${storagePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Footer */}
      <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
        <Link
          to={`/platform/applications/${app.id}`}
          className="flex-1 text-center py-2 px-3 bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-all border border-slate-700/60"
        >
          Manage Center
        </Link>

        {app.status === 'active' && (
          <a
            href={`https://${primaryDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl transition-colors shrink-0"
            title="Open Live Website"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
};
