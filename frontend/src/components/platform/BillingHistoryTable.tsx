import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { BillingHistoryResponse, BillingHistoryItem } from '../../services/platform.api';

interface BillingHistoryTableProps {
  applicationId: string;
  onRefundClick?: (item: BillingHistoryItem) => void;
}

export const BillingHistoryTable: React.FC<BillingHistoryTableProps> = ({
  applicationId,
  onRefundClick,
}) => {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery<BillingHistoryResponse>({
    queryKey: ['billing-history', applicationId, page],
    queryFn: () => platformApi.getBillingHistory(applicationId, page, 10),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'captured':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-success bg-success/10 px-2.5 py-1 rounded-md border border-success/20">
            <CheckCircle2 className="w-3 h-3 shrink-0" />
            <span className="capitalize">Paid</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-error bg-error/10 px-2.5 py-1 rounded-md border border-error/20">
            <XCircle className="w-3 h-3 shrink-0" />
            <span className="capitalize">Failed</span>
          </span>
        );
      case 'refunded':
      case 'partially_refunded':
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20">
            <RotateCcw className="w-3 h-3 shrink-0" />
            <span className="capitalize">Refunded</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-md border border-warning/20">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="capitalize">Pending</span>
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-3xl p-8 text-center animate-pulse">
        <div className="h-6 w-32 bg-surface-elevated rounded-md mx-auto mb-4" />
        <div className="h-24 bg-surface-elevated/40 rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-surface border border-border rounded-3xl p-8 text-center space-y-3">
        <p className="text-xs text-error">Failed to load payment transactions.</p>
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 bg-surface-elevated hover:bg-surface text-xs font-semibold rounded-lg text-text-primary border border-border cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const transactions = data?.transactions || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  if (transactions.length === 0) {
    return (
      <div className="bg-surface-elevated border border-dashed border-border rounded-3xl p-10 text-center space-y-2">
        <Receipt className="w-8 h-8 text-text-tertiary mx-auto" />
        <p className="text-xs font-semibold text-text-secondary">No payment transactions yet</p>
        <p className="text-[11px] text-text-tertiary max-w-sm mx-auto">
          Invoices and receipts for subscription upgrades and renewals will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-xs">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-text-primary">Payment History & Invoices</h3>
          <p className="text-xs text-text-secondary">All recorded transactions and receipts for this application</p>
        </div>
        <span className="text-xs text-text-tertiary font-medium">
          Total {pagination.total} transaction{pagination.total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated text-text-tertiary font-semibold border-b border-border">
            <tr>
              <th className="py-3.5 px-6">Date</th>
              <th className="py-3.5 px-6">Plan & Cycle</th>
              <th className="py-3.5 px-6">Amount</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6">Reference</th>
              <th className="py-3.5 px-6 text-right">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-text-secondary">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-surface-elevated transition-colors">
                <td className="py-4 px-6 font-medium whitespace-nowrap">
                  <div className="text-text-primary">
                    {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-[10px] text-text-tertiary">
                    {new Date(tx.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="font-bold text-text-primary block">{tx.plan}</span>
                  <span className="text-[10px] text-text-tertiary capitalize">{tx.billingCycle} billing</span>
                </td>
                <td className="py-4 px-6 font-black text-text-primary whitespace-nowrap">
                  ₹{tx.amountMajor.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-4 px-6">{getStatusBadge(tx.status)}</td>
                <td className="py-4 px-6">
                  <div className="font-mono text-[11px] text-text-secondary truncate max-w-[160px]">
                    {tx.paymentId || tx.orderId || tx.id}
                  </div>
                  {tx.method && (
                    <span className="text-[10px] text-text-tertiary capitalize flex items-center space-x-1 mt-0.5">
                      <CreditCard className="w-2.5 h-2.5" />
                      <span>{tx.method}</span>
                    </span>
                  )}
                </td>
                <td className="py-4 px-6 text-right whitespace-nowrap">
                  {tx.invoiceNumber ? (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-md border border-accent/20">
                      <FileText className="w-3 h-3 shrink-0" />
                      <span>{tx.invoiceNumber}</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-text-tertiary">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.pages > 1 && (
        <div className="p-4 bg-surface-elevated border-t border-border flex items-center justify-between">
          <span className="text-xs text-text-secondary">
            Page <span className="text-text-primary font-bold">{pagination.page}</span> of{' '}
            <span className="text-text-primary font-bold">{pagination.pages}</span>
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="p-2 bg-surface hover:bg-surface-elevated disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-text-primary border border-border cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={pagination.page >= pagination.pages}
              className="p-2 bg-surface hover:bg-surface-elevated disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-text-primary border border-border cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
