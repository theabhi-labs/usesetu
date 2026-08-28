import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Receipt,
  RotateCcw,
  Calendar,
} from 'lucide-react';
import { superAdminApi } from '../../../services/superAdmin.api';
import type { SuperAdminRevenueResponse } from '../../../types/superAdmin.types';

export const SuperAdminRevenue: React.FC = () => {
  const [data, setData] = useState<SuperAdminRevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getRevenue();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch revenue analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  if (loading && !data) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-text-secondary">Loading financial analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-border">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h1 className="text-xl font-extrabold text-text-primary">Platform Revenue & Financial Ledger</h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Global MRR, ARR, captured transactions, and Razorpay payment reconciliation across all centers.
          </p>
        </div>
        <button
          onClick={fetchRevenue}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevated border border-border hover:bg-border text-xs font-semibold text-text-secondary transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Financials</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-border">
          <span className="text-[10px] uppercase font-bold text-text-tertiary">Gross Revenue</span>
          <div className="text-2xl font-black text-text-primary mt-2">
            ₹{(data?.summary.grossRevenue || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
            ₹{(data?.summary.monthToDate || 0).toLocaleString('en-IN')} this month
          </span>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border">
          <span className="text-[10px] uppercase font-bold text-text-tertiary">Estimated MRR / ARR</span>
          <div className="text-2xl font-black text-text-primary mt-2">
            ₹{(data?.summary.mrr || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">
            ₹{(data?.summary.arr || 0).toLocaleString('en-IN')} ARR
          </span>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border">
          <span className="text-[10px] uppercase font-bold text-text-tertiary">Successful Payments</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {data?.summary.successfulPayments || 0}
          </div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">Captured charges</span>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-border">
          <span className="text-[10px] uppercase font-bold text-text-tertiary">Failed / Refunds</span>
          <div className="text-2xl font-black text-amber-500 mt-2">{data?.summary.failedPayments || 0}</div>
          <span className="text-[11px] text-text-secondary mt-0.5 block">{data?.summary.refunds || 0} refunds</span>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-surface rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
              Recent Platform Transactions
            </h2>
          </div>
          <span className="text-xs text-text-tertiary">Live Razorpay ledger</span>
        </div>

        {(!data?.recentTransactions || data.recentTransactions.length === 0) ? (
          <div className="p-12 text-center text-xs text-text-tertiary">
            <CreditCard className="w-8 h-8 text-text-tertiary/50 mx-auto mb-2" />
            No payment transactions recorded yet. Live Razorpay transactions will appear here automatically when centers subscribe to paid plans.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-extrabold uppercase text-text-tertiary">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Transaction / Order ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {data?.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-elevated/40">
                    <td className="py-3 px-3 text-text-secondary">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 font-semibold text-text-primary">
                      {tx.plan} <span className="text-[10px] text-text-tertiary">({tx.billingCycle})</span>
                    </td>
                    <td className="py-3 px-3 font-black text-text-primary">₹{tx.amountMajor}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          tx.status === 'captured'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-text-secondary">{tx.paymentId}</td>
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
