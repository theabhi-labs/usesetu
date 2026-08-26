import React from 'react';
import { AlertTriangle, Clock, ArrowRight, RefreshCw } from 'lucide-react';

interface GracePeriodBannerProps {
  subscription: {
    status: string;
    gracePeriodEndsAt?: string;
    metadata?: {
      lastPaymentFailure?: {
        reason?: string;
        date?: string;
      };
    };
  } | null;
  onRetryClick?: () => void;
}

export const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({
  subscription,
  onRetryClick,
}) => {
  if (!subscription || subscription.status !== 'past_due') {
    return null;
  }

  const now = new Date();
  const graceEnd = subscription.gracePeriodEndsAt
    ? new Date(subscription.gracePeriodEndsAt)
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const diffMs = graceEnd.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  const failureReason = subscription.metadata?.lastPaymentFailure?.reason || 'Payment could not be processed';

  return (
    <div className="bg-gradient-to-r from-rose-950/40 via-amber-950/30 to-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-2">
      <div className="flex items-start space-x-3.5">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Grace Period Active
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{daysRemaining} Day{daysRemaining === 1 ? '' : 's'} Remaining</span>
            </span>
          </div>
          <h4 className="text-sm sm:text-base font-bold text-white">
            Payment Failed — Services Remain Active
          </h4>
          <p className="text-xs text-slate-300 max-w-xl">
            {failureReason}. Your citizen center operations will remain live until{' '}
            <strong className="text-amber-200">{graceEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>.
            Please update your payment method to avoid service downgrade to the free tier.
          </p>
        </div>
      </div>

      {onRetryClick && (
        <button
          type="button"
          onClick={onRetryClick}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-500/20 transition-all shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Payment Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
