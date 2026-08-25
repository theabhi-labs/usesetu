import React, { useState } from 'react';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import type { PlanItem, ApplicationUsageResponse } from '../../services/platform.api';
import { formatBytes } from './UsageGauge';

interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: PlanItem | null;
  currentPlanName: string;
  billingCycle: 'monthly' | 'yearly';
  usageData?: ApplicationUsageResponse;
  onConfirm: (planId: string, billingCycle: 'monthly' | 'yearly', reason: string) => Promise<void>;
  isLoading?: boolean;
}

export const PlanChangeModal: React.FC<PlanChangeModalProps> = ({
  isOpen,
  onClose,
  targetPlan,
  currentPlanName,
  billingCycle,
  usageData,
  onConfirm,
  isLoading = false,
}) => {
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !targetPlan) return null;

  const targetPlanId = targetPlan.id || targetPlan._id;
  const targetStorageLimit =
    targetPlan.entitlements.maxStorageBytes ?? targetPlan.entitlements.storage?.limit ?? 1073741824;
  const targetUsersLimit =
    targetPlan.entitlements.maxActiveUsers ?? targetPlan.entitlements.activeUsers?.limit ?? 5;

  // Check if this is a downgrade that exceeds new limits
  const isDowngradeStorageOver =
    usageData?.metrics?.storage?.used !== undefined &&
    targetStorageLimit !== -1 &&
    usageData.metrics.storage.used > targetStorageLimit;

  const isDowngradeUsersOver =
    usageData?.metrics?.activeUsers?.used !== undefined &&
    targetUsersLimit !== -1 &&
    usageData.metrics.activeUsers.used > targetUsersLimit;

  const hasOverQuotaWarning = isDowngradeStorageOver || isDowngradeUsersOver;

  const price =
    billingCycle === 'monthly' ? targetPlan.pricing.monthly : targetPlan.pricing.yearly;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      await onConfirm(targetPlanId, billingCycle, reason || `Plan changed to ${targetPlan.name}`);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to change plan.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">Confirm Plan Change</h3>
            <p className="text-xs text-slate-400">Review your new plan limits and billing cycle</p>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Transition Summary */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Current Plan
            </span>
            <p className="text-sm font-bold text-slate-300 uppercase">{currentPlanName}</p>
          </div>

          <ArrowRight className="w-5 h-5 text-orange-400 shrink-0" />

          <div className="space-y-1 text-right">
            <span className="text-[10px] text-orange-400 uppercase tracking-wider font-bold">
              New Plan
            </span>
            <p className="text-sm font-black text-white uppercase">{targetPlan.name}</p>
            <p className="text-xs text-amber-400 font-bold">
              ₹{price.toLocaleString()} / {billingCycle === 'monthly' ? 'mo' : 'yr'}
            </p>
          </div>
        </div>

        {/* Over-Quota Warning if Downgrading */}
        {hasOverQuotaWarning && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs space-y-2">
            <div className="flex items-center space-x-2 font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Over-Quota Warning: Current Usage Exceeds Plan Limit</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Your existing data will not be deleted, but your current usage exceeds the new plan limit:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              {isDowngradeStorageOver && (
                <li>
                  Storage used: <strong>{formatBytes(usageData!.metrics.storage.used)}</strong> (New limit:{' '}
                  <strong>{formatBytes(targetStorageLimit)}</strong>)
                </li>
              )}
              {isDowngradeUsersOver && (
                <li>
                  Active staff: <strong>{usageData!.metrics.activeUsers.used}</strong> (New limit:{' '}
                  <strong>{targetUsersLimit}</strong>)
                </li>
              )}
            </ul>
            <p className="text-[10px] text-amber-400/80 italic">
              * New file uploads or staff seat additions may be restricted until usage is within limits.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Reason / Notes (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scaling up center operations"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all"
            >
              {isLoading ? 'Updating...' : `Confirm ${targetPlan.name} Plan`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
