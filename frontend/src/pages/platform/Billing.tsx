import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { BillingOverviewData, PlanItem } from '../../services/platform.api';
import { PlanComparison } from '../../components/platform/PlanComparison';

export const BillingPage: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useQuery<BillingOverviewData>({
    queryKey: ['platform-billing'],
    queryFn: platformApi.getBillingOverview,
  });

  const { data: plansData } = useQuery<PlanItem[]>({
    queryKey: ['platform-plans'],
    queryFn: platformApi.getPlans,
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-slate-900/80 border border-slate-800 rounded-3xl" />
        <div className="h-64 bg-slate-900/60 border border-slate-800 rounded-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-rose-950/20 border border-rose-800/40 rounded-3xl p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-rose-200">Failed to load billing overview</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {(error as any)?.message || 'An error occurred communicating with the billing service.'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const subscriptions = data?.subscriptions || [];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 sm:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-orange-400 text-xs font-black uppercase tracking-wider">
            <CreditCard className="w-4 h-4" />
            <span>Platform Billing & Subscriptions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Account Subscriptions
          </h1>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Manage your plans, entitlements, and cloud billing cycles across all your provisioned applications.
          </p>
        </div>
      </div>

      {/* Active Subscriptions List */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white">Active Center Subscriptions</h2>
          <p className="text-xs text-slate-400">Applications currently connected to your account</p>
        </div>

        {subscriptions.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-10 text-center text-xs text-slate-500">
            No active application subscriptions found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((sub) => (
              <div
                key={sub.applicationId}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white line-clamp-1">
                      {sub.applicationName}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      {sub.subscription?.plan || 'Free'}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 block mb-3">{sub.primaryDomain}</span>

                  <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Status:</span>
                      <span className="font-bold text-emerald-400 uppercase text-[11px]">
                        {sub.subscription?.status || 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Cycle:</span>
                      <span className="text-slate-200 capitalize font-medium">
                        {sub.subscription?.billingCycle || 'Monthly'}
                      </span>
                    </div>
                    {sub.subscription?.pricing && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Price:</span>
                        <span className="text-white font-bold">
                          ₹{sub.subscription.pricing.monthly.toLocaleString()} / mo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  to={`/platform/applications/${sub.applicationId}?tab=billing`}
                  className="w-full inline-flex items-center justify-center space-x-1.5 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors border border-slate-700/60"
                >
                  <span>Manage Center Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Plans Matrix */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-lg font-black text-white">Platform Plan Tiers</h2>
          <p className="text-xs text-slate-400">
            Compare plans, storage limits, and feature entitlements. Prices update directly from the platform database.
          </p>
        </div>

        <PlanComparison plans={plansData || []} />
      </div>

      {/* Billing History Empty State */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
          Invoices & Transactions
        </h3>
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-2">
          <CreditCard className="w-8 h-8 text-slate-600 mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-300">No billing transactions yet</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Direct card & UPI payment gateway integrations (Razorpay / Stripe) will be activated in Stage 7.
          </p>
        </div>
      </div>
    </div>
  );
};
