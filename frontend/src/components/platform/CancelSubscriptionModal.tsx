import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanName: string;
  onConfirm: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

export const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  currentPlanName,
  onConfirm,
  isLoading = false,
}) => {
  const [reason, setReason] = useState<string>('');
  const [confirmWord, setConfirmWord] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for cancelling your subscription.');
      return;
    }
    if (confirmWord.toLowerCase() !== 'cancel') {
      setError('Please type "cancel" to confirm.');
      return;
    }

    try {
      setError(null);
      await onConfirm(reason);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to cancel subscription.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2 text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-base font-bold text-white">Cancel Subscription</h3>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-xs leading-relaxed space-y-1">
          <p className="font-bold">Important Information:</p>
          <p>
            Your current <strong>{currentPlanName}</strong> plan will remain active until the end of your
            current billing cycle, after which your application will gracefully transition to the Free plan.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Reason for Cancellation <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tell us why you are cancelling..."
              required
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Type <strong className="text-rose-400">cancel</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder="cancel"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Keep Subscription
            </button>
            <button
              type="submit"
              disabled={isLoading || confirmWord.toLowerCase() !== 'cancel' || !reason.trim()}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-rose-600/20"
            >
              {isLoading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
