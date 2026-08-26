import React, { useEffect, useState } from 'react';
import { adminOperationsApi } from '../../../services/adminOperations.api';

export const BillingHealth: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await adminOperationsApi.getBillingHealth();
      setHealth(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Payment Telemetry</h1>
          <p className="text-sm text-gray-500 mt-1">Read-only operational observability for Razorpay transactions and webhook health</p>
        </div>
        <button
          onClick={fetchHealth}
          className="px-3.5 py-1.5 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50"
        >
          Refresh Telemetry
        </button>
      </div>

      {loading && !health ? (
        <div className="p-8 text-center text-gray-500">Loading billing telemetry...</div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Payment Success Rate</span>
              <div className="text-3xl font-bold text-emerald-600 mt-2">{health?.summary.paymentSuccessRate}%</div>
              <p className="text-xs text-gray-400 mt-1">Total Volume: ₹{health?.summary.totalVolumeINR.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Captured Transactions</span>
              <div className="text-3xl font-bold text-gray-900 mt-2">{health?.summary.capturedCount}</div>
              <p className="text-xs text-rose-500 mt-1">{health?.summary.failedCount} Failed • {health?.summary.refundedCount} Refunded</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Webhook Reliability</span>
              <div className="text-3xl font-bold text-indigo-600 mt-2">{health?.webhooks.webhookSuccessRate}%</div>
              <p className="text-xs text-gray-400 mt-1">{health?.webhooks.processedCount} of {health?.webhooks.totalEvents} processed</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase">Grace Period Subscriptions</span>
              <div className="text-3xl font-bold text-amber-600 mt-2">{health?.subscriptions.inGracePeriodCount}</div>
              <p className="text-xs text-gray-400 mt-1">{health?.subscriptions.totalExpired} Expired (Free fallback)</p>
            </div>
          </div>

          {/* Subscriptions & Reconciliation Deep Dive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Subscription States</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Active Paid Subscriptions</span>
                  <span className="font-semibold text-emerald-600">{health?.subscriptions.totalActive}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Trialing Subscriptions</span>
                  <span className="font-semibold text-blue-600">{health?.subscriptions.totalTrialing}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Past Due (7d Grace Active)</span>
                  <span className="font-semibold text-amber-600">{health?.subscriptions.totalPastDue}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Expired Subscriptions</span>
                  <span className="font-semibold text-rose-600">{health?.subscriptions.totalExpired}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Cancelled Subscriptions</span>
                  <span className="font-semibold text-gray-600">{health?.subscriptions.totalCancelled}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Webhook & Reconciliation Telemetry</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Total Webhooks Ingested</span>
                  <span className="font-semibold text-gray-900">{health?.webhooks.totalEvents}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Duplicate Webhook Retries</span>
                  <span className="font-semibold text-blue-600">{health?.webhooks.duplicateCount}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Failed Webhook Deliveries</span>
                  <span className="font-semibold text-rose-600">{health?.webhooks.failedCount}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Self-Healing Reconciliation Runs</span>
                  <span className="font-semibold text-indigo-600">{health?.reconciliation.recentReconciliationEvents}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Automated Payment Recoveries</span>
                  <span className="font-semibold text-emerald-600">{health?.reconciliation.recoveredCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
