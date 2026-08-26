import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { BillingAuditsResponse } from '../../services/platform.api';

interface BillingAuditTableProps {
  applicationId: string;
}

export const BillingAuditTable: React.FC<BillingAuditTableProps> = ({ applicationId }) => {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery<BillingAuditsResponse>({
    queryKey: ['billing-audits', applicationId, page],
    queryFn: () => platformApi.getBillingAudits(applicationId, page, 10),
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'SUBSCRIPTION_ACTIVATED':
      case 'SUBSCRIPTION_UPGRADED':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            <span>{action.replace('SUBSCRIPTION_', '')}</span>
          </span>
        );
      case 'SUBSCRIPTION_RECOVERED':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>RECOVERED</span>
          </span>
        );
      case 'SUBSCRIPTION_RENEWED':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
            <Clock className="w-3 h-3" />
            <span>RENEWED</span>
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>PAYMENT FAILED</span>
          </span>
        );
      case 'SUBSCRIPTION_EXPIRED':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>EXPIRED</span>
          </span>
        );
      case 'REFUND_COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
            <RotateCcw className="w-3 h-3" />
            <span>REFUNDED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
            <span>{action.replace(/_/g, ' ')}</span>
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center animate-pulse">
        <div className="h-6 w-32 bg-slate-800 rounded-md mx-auto mb-4" />
        <div className="h-24 bg-slate-800/40 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
        <p className="text-xs text-rose-400">Failed to load billing audit records.</p>
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const audits = data?.audits || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  if (audits.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-2">
        <History className="w-8 h-8 text-slate-600 mx-auto" />
        <p className="text-xs font-semibold text-slate-400">No audit history recorded yet</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-0">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span>Immutable Billing Audit Trail</span>
          </h3>
          <p className="text-xs text-slate-400">
            Complete chronological record of all commercial transactions, renewals, recoveries, and state changes
          </p>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          Total {pagination.total} audit entr{pagination.total === 1 ? 'y' : 'ies'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-6">Timestamp</th>
              <th className="py-3.5 px-6">Action</th>
              <th className="py-3.5 px-6">Plan / Transition</th>
              <th className="py-3.5 px-6">Status Change</th>
              <th className="py-3.5 px-6">Reason / Reference</th>
              <th className="py-3.5 px-6 text-right">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {audits.map((item) => (
              <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-6 font-medium whitespace-nowrap">
                  <div className="text-white">
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {new Date(item.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </td>
                <td className="py-4 px-6">{getActionBadge(item.action)}</td>
                <td className="py-4 px-6">
                  {item.oldPlan?.name || item.newPlan?.name ? (
                    <div className="flex items-center space-x-1 font-semibold text-slate-200">
                      {item.oldPlan && <span>{item.oldPlan.name}</span>}
                      {item.oldPlan && item.newPlan && item.oldPlan.name !== item.newPlan.name && (
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                      )}
                      {item.newPlan && item.newPlan.name !== item.oldPlan?.name && (
                        <span className="text-orange-400">{item.newPlan.name}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  {item.oldStatus || item.newStatus ? (
                    <div className="flex items-center space-x-1.5 uppercase text-[10px] font-bold">
                      {item.oldStatus && <span className="text-slate-400">{item.oldStatus}</span>}
                      {item.oldStatus && item.newStatus && <ArrowRight className="w-2.5 h-2.5 text-slate-600" />}
                      {item.newStatus && <span className="text-emerald-400">{item.newStatus}</span>}
                    </div>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <p className="text-slate-300 truncate max-w-xs">{item.reason || 'System operation'}</p>
                </td>
                <td className="py-4 px-6 text-right whitespace-nowrap">
                  {item.actorId ? (
                    <div className="flex items-center justify-end space-x-1 text-slate-400">
                      <User className="w-3 h-3 text-slate-500" />
                      <span className="text-[11px] font-medium">{item.actorId.name || item.actorId.email}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-600 uppercase">System Worker</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Page <span className="text-white font-bold">{pagination.page}</span> of{' '}
            <span className="text-white font-bold">{pagination.pages}</span>
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={pagination.page >= pagination.pages}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
