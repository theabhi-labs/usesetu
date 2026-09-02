import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminOperationsApi } from '../../../services/adminOperations.api';
import type { OperationsOverview } from '../../../services/adminOperations.api';

export const OperationsDashboard: React.FC = () => {
  const [data, setData] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const overview = await adminOperationsApi.getOverview();
      setData(overview);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load operations telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg inline-block">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchOverview}
            className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header & Subnav */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">SaaS Operations Command Center</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                data?.system.status === 'operational'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {data?.system.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time telemetry, database health, billing observability, and incident response
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/operations/incidents"
            className="px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Incidents ({data?.incidents.openCount || 0})
          </Link>
          <Link
            to="/admin/operations/errors"
            className="px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Errors ({data?.errors.unresolvedCriticalCount || 0})
          </Link>
          <Link
            to="/admin/operations/jobs"
            className="px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Background Jobs
          </Link>
          <Link
            to="/admin/operations/billing-health"
            className="px-3.5 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
          >
            Billing Health
          </Link>
        </div>
      </div>

      {/* Top Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Database Health Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Database</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                data?.system.database.status === 'healthy'
                  ? 'bg-emerald-500'
                  : data?.system.database.status === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
            />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{data?.system.database.latencyMs} ms</div>
            <div className="text-xs text-gray-500 mt-1">
              Ping Latency • Status: <span className="font-medium text-gray-700">{data?.system.database.readyStateText}</span>
            </div>
          </div>
        </div>

        {/* API Latency Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">API Performance</span>
            <span className="text-xs text-gray-400">{data?.performance.requestsPerMinute} req/min</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{data?.performance.p95Ms} ms <span className="text-xs text-gray-500 font-normal">P95</span></div>
            <div className="text-xs text-gray-500 mt-1">
              P50: {data?.performance.p50Ms}ms • P99: {data?.performance.p99Ms}ms
            </div>
          </div>
        </div>

        {/* Payment Success Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Success</span>
            <span className="text-xs text-emerald-600 font-medium">₹{data?.billing.totalVolumeINR.toLocaleString()} Vol</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{data?.billing.paymentSuccessRate}%</div>
            <div className="text-xs text-gray-500 mt-1">
              {data?.billing.capturedCount} Captured • {data?.billing.failedCount} Failed
            </div>
          </div>
        </div>

        {/* Webhooks Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Razorpay Webhooks</span>
            <span className="text-xs text-gray-400">{data?.webhooks.totalEvents} Total</span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{data?.webhooks.webhookSuccessRate}%</div>
            <div className="text-xs text-gray-500 mt-1">
              {data?.webhooks.processedCount} Processed • {data?.webhooks.duplicateCount} Duplicates
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Subscriptions & Domain Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscription Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Subscription States</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-600">Active Subscriptions</span>
              <span className="font-semibold text-emerald-600">{data?.subscriptions.totalActive}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-600">Trialing</span>
              <span className="font-semibold text-blue-600">{data?.subscriptions.totalTrialing}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-600">Past Due (7d Grace)</span>
              <span className="font-semibold text-amber-600">{data?.subscriptions.totalPastDue}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600">Expired (Free Fallback)</span>
              <span className="font-semibold text-rose-600">{data?.subscriptions.totalExpired}</span>
            </div>
          </div>
        </div>

        {/* Domain & SSL Health */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Domain & SSL Health</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-600">Active SSL Domains</span>
              <span className="font-semibold text-emerald-600">{data?.domains.sslActive}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-600">Pending DNS Verification</span>
              <span className="font-semibold text-amber-600">{data?.domains.pendingVerification}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-600">SSL Provisioning Pending</span>
              <span className="font-semibold text-blue-600">{data?.domains.sslPending}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600">Verification / SSL Failed</span>
              <span className="font-semibold text-rose-600">
                {(data?.domains.failedVerification || 0) + (data?.domains.sslFailed || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Applications Fleet */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Platform Fleet</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-600">Total Applications</span>
              <span className="font-semibold text-gray-900">{data?.applications.totalApplications}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-600">Active Applications</span>
              <span className="font-semibold text-emerald-600">{data?.applications.active}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-gray-100">
              <span className="text-gray-600">Total Tenant Accounts</span>
              <span className="font-semibold text-indigo-600">{data?.applications.totalAccounts}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-600">Suspended / Archived</span>
              <span className="font-semibold text-gray-600">
                {(data?.applications.suspended || 0) + (data?.applications.archived || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
