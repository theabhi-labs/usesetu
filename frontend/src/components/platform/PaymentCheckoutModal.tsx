import React, { useState } from 'react';
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Lock,
} from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { PlanItem } from '../../services/platform.api';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  applicationName: string;
  plan: PlanItem;
  initialCycle?: 'monthly' | 'yearly';
  onPaymentSuccess?: () => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  applicationName,
  plan,
  initialCycle = 'monthly',
  onPaymentSuccess,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(initialCycle);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const price = billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;
  const isFree = price === 0;

  // Dynamically load Razorpay checkout script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      if (isFree) {
        // Direct free tier transition
        await platformApi.changeApplicationPlan(applicationId, {
          planId: plan._id || plan.id!,
          billingCycle,
        });
        setSuccess(true);
        setTimeout(() => {
          onPaymentSuccess?.();
          onClose();
        }, 1500);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 1. Create Server-Side Order
      const checkoutData = await platformApi.createBillingCheckout(applicationId, {
        planId: plan._id || plan.id!,
        billingCycle,
      });

      // 2. Open Razorpay Checkout Dialog
      const options = {
        key: checkoutData.razorpayKeyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency || 'INR',
        name: 'UseSetu Cloud',
        description: `Upgrade "${applicationName}" to ${plan.name} (${billingCycle})`,
        order_id: checkoutData.orderId,
        handler: async function (response: any) {
          setVerifying(true);
          try {
            // 3. Verify Payment on Server
            await platformApi.verifyBillingPayment(applicationId, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setSuccess(true);
            setTimeout(() => {
              onPaymentSuccess?.();
              onClose();
            }, 1800);
          } catch (err: any) {
            setErrorMessage(err?.response?.data?.message || err.message || 'Payment verification failed on server');
          } finally {
            setVerifying(false);
          }
        },
        prefill: {
          name: applicationName,
        },
        theme: {
          color: '#f97316',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', function (resp: any) {
        setErrorMessage(resp?.error?.description || 'Payment was declined by provider');
        setLoading(false);
      });
      razorpayInstance.open();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err.message || 'Checkout creation failed');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={verifying}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success State */}
        {success ? (
          <div className="text-center py-8 space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-white">Subscription Activated!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Your application <span className="text-white font-semibold">{applicationName}</span> is now active on the{' '}
              <span className="text-orange-400 font-bold">{plan.name}</span> plan.
            </p>
          </div>
        ) : verifying ? (
          <div className="text-center py-10 space-y-4">
            <Loader2 className="w-12 h-12 text-orange-400 animate-spin mx-auto" />
            <h3 className="text-lg font-bold text-white">Verifying Payment Signature...</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Securing cryptographic proof with provider and provisioning live cloud entitlements.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-orange-400 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Plan Upgrade & Checkout</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Subscribe to {plan.name}</h2>
              <p className="text-xs text-slate-400">
                Application: <span className="text-slate-200 font-semibold">{applicationName}</span>
              </p>
            </div>

            {/* Billing Cycle Switcher */}
            <div className="bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-black">SAVE 20%</span>
              </button>
            </div>

            {/* Price & Breakdown Card */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Plan Amount ({billingCycle})</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-white">₹{price.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-slate-500"> / {billingCycle === 'yearly' ? 'year' : 'month'}</span>
                </div>
              </div>

              <div className="border-t border-slate-800/80 pt-3 text-xs space-y-1.5 text-slate-400">
                <div className="flex justify-between">
                  <span>Storage Capacity</span>
                  <span className="text-slate-200 font-semibold">
                    {plan.entitlements?.storage?.limit
                      ? `${(plan.entitlements.storage.limit / (1024 * 1024)).toFixed(0)} MB`
                      : 'Unlimited'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Operator Staff Seats</span>
                  <span className="text-slate-200 font-semibold">
                    {plan.entitlements?.activeUsers?.limit ?? 'Unlimited'} Seats
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Custom Domains</span>
                  <span className="text-slate-200 font-semibold">
                    {plan.entitlements?.customDomain?.enabled ? 'Included' : 'Not Included'}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {errorMessage && (
              <div className="bg-rose-950/30 border border-rose-800/50 rounded-2xl p-3.5 flex items-start space-x-2.5 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Security Guarantee Note */}
            <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800/50">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>256-bit encrypted checkout via Razorpay. Card and UPI credentials are never stored.</span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing Order...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isFree ? 'Switch to Free Plan' : `Pay ₹${price.toLocaleString('en-IN')}`}</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
