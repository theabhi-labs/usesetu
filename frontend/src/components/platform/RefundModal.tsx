import React, { useState } from 'react';
import { RotateCcw, AlertCircle, Loader2, X, ShieldAlert } from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { BillingHistoryItem } from '../../services/platform.api';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  transaction: BillingHistoryItem | null;
  onSuccess?: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  transaction,
  onSuccess,
}) => {
  const [amountInput, setAmountInput] = useState<string>('');
  const [isFullRefund, setIsFullRefund] = useState(true);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const maxRefundMajor = transaction.amountMajor;

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const amountPaise = isFullRefund ? undefined : Math.round(parseFloat(amountInput) * 100);

      await platformApi.refundBillingPayment(
        applicationId,
        transaction.paymentId || transaction.id,
        {
          amount: amountPaise,
          reason: reason || 'Account owner requested refund',
        },
      );

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Refund processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-black uppercase tracking-wider">
            <RotateCcw className="w-4 h-4" />
            <span>Payment Refund</span>
          </div>
          <h2 className="text-xl font-black text-white">Issue Transaction Refund</h2>
          <p className="text-xs text-slate-400">
            Reference: <span className="font-mono text-slate-200">{transaction.paymentId || transaction.id}</span>
          </p>
        </div>

        <form onSubmit={handleRefund} className="space-y-4">
          <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Original Payment</span>
              <span className="text-white font-bold">₹{maxRefundMajor.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Plan</span>
              <span className="text-white font-medium">{transaction.plan}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-300 font-bold">Refund Type</label>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-1.5 cursor-pointer text-slate-400 hover:text-white">
                  <input
                    type="radio"
                    checked={isFullRefund}
                    onChange={() => setIsFullRefund(true)}
                    className="text-purple-500 focus:ring-purple-500"
                  />
                  <span>Full</span>
                </label>
                <label className="flex items-center space-x-1.5 cursor-pointer text-slate-400 hover:text-white">
                  <input
                    type="radio"
                    checked={!isFullRefund}
                    onChange={() => setIsFullRefund(false)}
                    className="text-purple-500 focus:ring-purple-500"
                  />
                  <span>Partial</span>
                </label>
              </div>
            </div>

            {!isFullRefund && (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  max={maxRefundMajor}
                  min="1"
                  required
                  placeholder={`Amount (max ₹${maxRefundMajor})`}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Reason for Refund</label>
            <input
              type="text"
              placeholder="e.g. Customer billing adjustment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>

          {errorMessage && (
            <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-3 flex items-start space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="bg-purple-950/20 border border-purple-800/40 p-3 rounded-xl flex items-start space-x-2 text-[11px] text-purple-300">
            <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>Refunds are transmitted directly to Razorpay and credited to the original payment source.</span>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Process Refund</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
