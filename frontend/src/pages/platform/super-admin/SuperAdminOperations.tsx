import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Database,
  Activity,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { adminOperationsApi } from '../../../services/adminOperations.api';
import type { OperationsOverview } from '../../../services/adminOperations.api';

export const SuperAdminOperations: React.FC = () => {
  const [data, setData] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await adminOperationsApi.getOverview();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch operations telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-text-secondary">Loading system telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent" />
            <h1 className="text-xl font-extrabold text-text-primary">System Telemetry & Database Diagnostics</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Real-time API performance, database latency, connection pools, and platform health.
          </p>
        </div>
        <button
          onClick={fetchOverview}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:bg-border text-xs font-semibold text-text-secondary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Database Status</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {data?.system.database.status || 'Operational'}
          </div>
          <span className="text-[11px] text-text-secondary mt-1 block">
            Latency: {data?.system.database.latencyMs}ms • Pool: {data?.system.database.collections || 10} collections
          </span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Requests Per Minute</span>
            <Activity className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-black text-text-primary mt-2">
            {data?.performance.requestsPerMinute || 0} RPM
          </div>
          <span className="text-[11px] text-text-secondary mt-1 block">
            P50: {data?.performance.p50Ms}ms • P95: {data?.performance.p95Ms}ms
          </span>
        </div>

        <div className="bg-surface p-5 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Platform Uptime</span>
            <Server className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-text-primary mt-2">
            {Math.floor((data?.system.uptimeSeconds || 0) / 3600)}h {Math.floor(((data?.system.uptimeSeconds || 0) % 3600) / 60)}m
          </div>
          <span className="text-[11px] text-text-secondary mt-1 block">
            Error rate: {data?.performance.errorRatePercent || 0}%
          </span>
        </div>
      </div>
    </div>
  );
};
