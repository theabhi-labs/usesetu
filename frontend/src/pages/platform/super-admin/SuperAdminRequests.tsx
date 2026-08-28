import React, { useEffect, useState } from 'react';
import {
  ActivitySquare,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { superAdminApi } from '../../../services/superAdmin.api';
import type { SuperAdminRequestsWatchdog } from '../../../types/superAdmin.types';

export const SuperAdminRequests: React.FC = () => {
  const [data, setData] = useState<SuperAdminRequestsWatchdog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWatchdog = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getRequestsWatchdog();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch requests telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchdog();
    const interval = setInterval(fetchWatchdog, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-text-secondary">Loading requests watchdog...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <ActivitySquare className="w-5 h-5 text-accent" />
            <h1 className="text-xl font-extrabold text-text-primary">Global Citizen Requests Watchdog</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Real-time aggregate processing metrics, completion rates, and failure tracking across all centers.
          </p>
        </div>
        <button
          onClick={fetchWatchdog}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:bg-border/30 text-xs font-semibold text-text-secondary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Watchdog</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-text-tertiary">All-Time Requests</span>
            <ActivitySquare className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-black text-text-primary mt-2">{data?.summary.total || 0}</div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">{data?.summary.today || 0} today</span>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-text-tertiary">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {data?.summary.completed || 0}
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">Delivered successfully</span>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-text-tertiary">In Progress / Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500 mt-2">{data?.summary.pending || 0}</div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">Under review & desk queue</span>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-text-tertiary">Rejected / Cancelled</span>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-500 mt-2">{data?.summary.failedOrCancelled || 0}</div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">Total rejected requests</span>
        </div>
      </div>

      {/* Tenant Rankings by Request Volume */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
              Top CSC Centers by Citizen Intake Volume
            </h2>
          </div>
          <span className="text-xs text-text-tertiary">Ranked by total requests</span>
        </div>

        {data?.rankings.length === 0 ? (
          <div className="p-8 text-center text-xs text-text-tertiary">No requests recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-extrabold uppercase text-text-tertiary">
                  <th className="py-2.5 px-3">CSC Center</th>
                  <th className="py-2.5 px-3 text-center">Total Requests</th>
                  <th className="py-2.5 px-3 text-center">Completed</th>
                  <th className="py-2.5 px-3 text-center">Pending</th>
                  <th className="py-2.5 px-3 text-center">Failed</th>
                  <th className="py-2.5 px-3 text-right">Failure Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {data?.rankings.map((tr) => (
                  <tr key={tr.slug} className="hover:bg-surface-elevated/40">
                    <td className="py-3 px-3">
                      <div className="font-bold text-text-primary">{tr.name}</div>
                      <div className="text-[11px] text-text-tertiary">Slug: {tr.slug}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-extrabold text-text-primary">{tr.totalRequests}</td>
                    <td className="py-3 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                      {tr.completed}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-amber-500">{tr.pending}</td>
                    <td className="py-3 px-3 text-center font-semibold text-red-500">{tr.failed}</td>
                    <td className="py-3 px-3 text-right font-bold text-text-primary">{tr.failureRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
