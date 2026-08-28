import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import type { PlanItem } from '../../services/platform.api';
import { formatBytes } from './UsageGauge';

interface PlanComparisonProps {
  plans: PlanItem[];
  currentPlanSlug?: string;
  onSelectPlan?: (plan: PlanItem, billingCycle: 'monthly' | 'yearly') => void;
  isLoading?: boolean;
}

export const PlanComparison: React.FC<PlanComparisonProps> = ({
  plans,
  currentPlanSlug,
  onSelectPlan,
  isLoading = false,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Sort plans by price
  const sortedPlans = [...plans].sort((a, b) => a.pricing.monthly - b.pricing.monthly);

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center">
        <div className="bg-surface-elevated p-1 rounded-2xl border border-border flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-accent text-white shadow-md shadow-accent/20'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              billingCycle === 'yearly'
                ? 'bg-accent text-white shadow-md shadow-accent/20'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Yearly Billing</span>
            <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.2 rounded-full font-extrabold uppercase">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sortedPlans.map((plan) => {
          const planId = plan.id || plan._id;
          const isCurrent = currentPlanSlug?.toLowerCase() === plan.slug.toLowerCase();
          const price =
            billingCycle === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly;

          const activeUsersLimit =
            plan.entitlements.maxActiveUsers ?? plan.entitlements.activeUsers?.limit ?? 5;
          const storageLimitBytes =
            plan.entitlements.maxStorageBytes ?? plan.entitlements.storage?.limit ?? 1073741824;
          const requestsLimit =
            plan.entitlements.maxRequestsPerMonth ?? plan.entitlements.monthlyRequests?.limit ?? 200;
          const appointmentsLimit =
            plan.entitlements.maxAppointmentsPerMonth ?? plan.entitlements.monthlyAppointments?.limit ?? 50;

          const customDomainEnabled =
            plan.entitlements.features?.customDomain ?? plan.entitlements.customDomain?.enabled ?? false;
          const whatsappEnabled =
            plan.entitlements.features?.whatsapp ?? plan.entitlements.whatsapp?.enabled ?? false;
          const exportReportsEnabled =
            plan.entitlements.features?.exportReports ?? plan.entitlements.exportReports?.enabled ?? false;

          return (
            <div
              key={planId}
              className={`bg-surface border rounded-3xl p-6 flex flex-col justify-between transition-all relative shadow-xs ${
                isCurrent
                  ? 'border-accent ring-2 ring-accent/20 shadow-xl shadow-accent/5'
                  : 'border-border hover:border-border-strong'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-accent to-accent-hover text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                  Active Plan
                </div>
              )}

              <div>
                <h3 className="text-lg font-black text-text-primary uppercase tracking-tight mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-text-secondary line-clamp-2 min-h-[32px] mb-4">
                  {plan.description || 'Comprehensive plan for digital centers'}
                </p>

                <div className="mb-6">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-black text-text-primary">₹{price.toLocaleString()}</span>
                    <span className="text-xs text-text-tertiary font-medium">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-3 pt-4 border-t border-border text-xs">
                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-text-tertiary">Staff Seats:</span>
                    <span className="font-bold text-text-primary">
                      {activeUsersLimit === -1 ? 'Unlimited' : `${activeUsersLimit} Seats`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-text-tertiary">Cloud Storage:</span>
                    <span className="font-bold text-text-primary">
                      {storageLimitBytes === -1 ? 'Unlimited' : formatBytes(storageLimitBytes)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-text-tertiary">Monthly Requests:</span>
                    <span className="font-bold text-text-primary">
                      {requestsLimit === -1 ? 'Unlimited' : requestsLimit.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-text-tertiary">Monthly Appointments:</span>
                    <span className="font-bold text-text-primary">
                      {appointmentsLimit === -1 ? 'Unlimited' : appointmentsLimit.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-text-tertiary">Custom Domain SSL:</span>
                    {customDomainEnabled ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <X className="w-4 h-4 text-text-tertiary" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-text-tertiary">WhatsApp Engine:</span>
                    {whatsappEnabled ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <X className="w-4 h-4 text-text-tertiary" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-text-secondary">
                    <span className="text-text-tertiary">Export Reports:</span>
                    {exportReportsEnabled ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <X className="w-4 h-4 text-text-tertiary" />
                    )}
                  </div>
                </div>
              </div>

              {onSelectPlan && (
                <div className="pt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 bg-surface-elevated text-text-tertiary text-xs font-bold rounded-xl cursor-default border border-border"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectPlan(plan, billingCycle)}
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-accent to-accent-hover hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-lg shadow-accent/20 transition-all cursor-pointer"
                    >
                      Switch to {plan.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
